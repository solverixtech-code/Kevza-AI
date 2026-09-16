import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  TemplateSource,
  TemplateStatus,
  WhatsappTemplateCategory,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type TemplateInput = {
  tenantId?: string;
  createdById?: string;
  name?: string;
  displayName?: string;
  category?: WhatsappTemplateCategory;
  language?: string;
  bodyText?: string;
  components?: unknown;
  variables?: unknown;
  examples?: unknown;
  buttons?: unknown;
  source?: TemplateSource;
  status?: TemplateStatus;
  whatsappAccountId?: string;
};

type TemplateListInput = {
  tenantId?: string;
  status?: TemplateStatus;
  category?: WhatsappTemplateCategory;
  search?: string;
};

type MetaTemplateResponse = {
  id?: string;
  name?: string;
  status?: string;
  category?: string;
  rejected_reason?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type MetaTemplateComponent = {
  type: 'BODY' | 'BUTTONS';
  text?: string;
  example?: {
    body_text?: string[][];
  };
  buttons?: Array<{
    type: 'URL';
    text: string;
    url: string;
  }>;
};

const ALLOWED_CATEGORIES = Object.values(WhatsappTemplateCategory) as WhatsappTemplateCategory[];
const ALLOWED_STATUSES = Object.values(TemplateStatus) as TemplateStatus[];
const ALLOWED_SOURCES = Object.values(TemplateSource) as TemplateSource[];

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async listTemplates(input: TemplateListInput) {
    const tenantId = this.requireTenant(input.tenantId);
    const status = this.parseEnum(input.status, ALLOWED_STATUSES, 'status');
    const category = this.parseEnum(input.category, ALLOWED_CATEGORIES, 'category');
    const search = input.search?.trim();

    return this.prisma.messageTemplate.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { displayName: { contains: search, mode: 'insensitive' } },
                { bodyText: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        whatsappAccount: {
          select: {
            id: true,
            wabaId: true,
            displayPhone: true,
            status: true,
          },
        },
      },
    });
  }

  async createTemplate(input: TemplateInput) {
    const tenantId = this.requireTenant(input.tenantId);
    const bodyText = input.bodyText?.trim();

    if (!bodyText) {
      throw new BadRequestException('Template bodyText is required');
    }

    const category =
      this.parseEnum(input.category, ALLOWED_CATEGORIES, 'category') ?? WhatsappTemplateCategory.MARKETING;
    const source = this.parseEnum(input.source, ALLOWED_SOURCES, 'source') ?? TemplateSource.MANUAL;
    const status = this.parseEnum(input.status, ALLOWED_STATUSES, 'status') ?? TemplateStatus.DRAFT;
    const language = this.normalizeLanguage(input.language);
    const name = this.normalizeTemplateName(input.name || input.displayName || bodyText);

    await this.ensureWhatsappAccountBelongsToTenant(input.whatsappAccountId, tenantId);

    try {
      return await this.prisma.messageTemplate.create({
        data: {
          tenantId,
          createdById: input.createdById || null,
          whatsappAccountId: input.whatsappAccountId || null,
          name,
          displayName: input.displayName?.trim() || this.titleFromName(name),
          category,
          language,
          bodyText,
          components: this.asJson(input.components),
          variables: this.asJson(input.variables),
          examples: this.asJson(input.examples),
          buttons: this.asJson(input.buttons),
          source,
          status,
          metaStatus: status === TemplateStatus.DRAFT ? null : status,
        },
        include: this.includeRelations(),
      });
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException('A template with this name and language already exists');
      }

      throw error;
    }
  }

  async getTemplate(id: string, tenantId?: string) {
    const template = await this.findTemplate(id, this.requireTenant(tenantId));
    return template;
  }

  async updateTemplate(id: string, tenantId: string | undefined, input: TemplateInput) {
    const resolvedTenantId = this.requireTenant(tenantId);
    await this.findTemplate(id, resolvedTenantId);

    const data: Prisma.MessageTemplateUpdateInput = {};

    if (input.name !== undefined) data.name = this.normalizeTemplateName(input.name);
    if (input.displayName !== undefined) data.displayName = input.displayName?.trim() || null;
    if (input.category !== undefined) {
      data.category = this.parseEnum(input.category, ALLOWED_CATEGORIES, 'category');
    }
    if (input.language !== undefined) data.language = this.normalizeLanguage(input.language);
    if (input.bodyText !== undefined) {
      const bodyText = input.bodyText.trim();
      if (!bodyText) throw new BadRequestException('Template bodyText cannot be empty');
      data.bodyText = bodyText;
    }
    if (input.components !== undefined) data.components = this.asJson(input.components);
    if (input.variables !== undefined) data.variables = this.asJson(input.variables);
    if (input.examples !== undefined) data.examples = this.asJson(input.examples);
    if (input.buttons !== undefined) data.buttons = this.asJson(input.buttons);
    if (input.source !== undefined) {
      data.source = this.parseEnum(input.source, ALLOWED_SOURCES, 'source');
    }
    if (input.status !== undefined) {
      const status = this.parseEnum(input.status, ALLOWED_STATUSES, 'status');
      data.status = status;
      data.metaStatus = status === TemplateStatus.DRAFT ? null : status;
    }
    if (input.whatsappAccountId !== undefined) {
      await this.ensureWhatsappAccountBelongsToTenant(input.whatsappAccountId, resolvedTenantId);
      data.whatsappAccount = input.whatsappAccountId
        ? { connect: { id: input.whatsappAccountId } }
        : { disconnect: true };
    }

    try {
      return await this.prisma.messageTemplate.update({
        where: { id },
        data,
        include: this.includeRelations(),
      });
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException('A template with this name and language already exists');
      }

      throw error;
    }
  }

  async deleteTemplate(id: string, tenantId?: string) {
    const resolvedTenantId = this.requireTenant(tenantId);
    await this.findTemplate(id, resolvedTenantId);
    await this.prisma.messageTemplate.delete({ where: { id } });

    return { success: true };
  }

  async submitTemplateToMeta(id: string, tenantId?: string) {
    const resolvedTenantId = this.requireTenant(tenantId);
    const template = await this.findTemplate(id, resolvedTenantId);

    if (template.metaTemplateId && template.status !== TemplateStatus.REJECTED) {
      throw new BadRequestException('Template has already been submitted to Meta');
    }

    const wabaId = this.getMetaConfig('META_WABA_ID');
    const accessToken = this.getMetaConfig('META_ACCESS_TOKEN');
    const graphVersion = this.config.get<string>('META_GRAPH_VERSION') || 'v23.0';
    const payload = this.buildMetaTemplatePayload(template);
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${wabaId}/message_templates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const metaPayload = (await response.json().catch(() => ({}))) as MetaTemplateResponse;

    if (!response.ok || metaPayload.error) {
      throw new HttpException(
        metaPayload.error?.message || 'Meta rejected the template submission request',
        response.status || 502,
      );
    }

    const metaStatus = metaPayload.status || TemplateStatus.PENDING;
    const status = this.toLocalTemplateStatus(metaStatus);

    return this.prisma.messageTemplate.update({
      where: { id: template.id },
      data: {
        metaTemplateId: metaPayload.id || null,
        metaStatus,
        status,
        rejectedReason: null,
        components: this.asJson(payload.components),
      },
      include: this.includeRelations(),
    });
  }

  async syncTemplateMetaStatus(id: string, tenantId?: string) {
    const resolvedTenantId = this.requireTenant(tenantId);
    const template = await this.findTemplate(id, resolvedTenantId);

    if (!template.metaTemplateId) {
      throw new BadRequestException('Template has not been submitted to Meta yet');
    }

    const accessToken = this.getMetaConfig('META_ACCESS_TOKEN');
    const graphVersion = this.config.get<string>('META_GRAPH_VERSION') || 'v23.0';
    const params = new URLSearchParams({
      fields: 'id,name,status,category,rejected_reason',
    });
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${template.metaTemplateId}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const metaPayload = (await response.json().catch(() => ({}))) as MetaTemplateResponse;

    if (!response.ok || metaPayload.error) {
      throw new HttpException(
        metaPayload.error?.message || 'Could not fetch template status from Meta',
        response.status || 502,
      );
    }

    const metaStatus = metaPayload.status || template.metaStatus || TemplateStatus.PENDING;
    const status = this.toLocalTemplateStatus(metaStatus);

    return this.prisma.messageTemplate.update({
      where: { id: template.id },
      data: {
        metaStatus,
        status,
        category: metaPayload.category
          ? this.toLocalTemplateCategory(metaPayload.category, template.category)
          : template.category,
        rejectedReason:
          status === TemplateStatus.REJECTED
            ? metaPayload.rejected_reason || template.rejectedReason || 'Meta rejected this template'
            : null,
      },
      include: this.includeRelations(),
    });
  }

  private async findTemplate(id: string, tenantId: string) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id, tenantId },
      include: this.includeRelations(),
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  private includeRelations() {
    return {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      whatsappAccount: {
        select: {
          id: true,
          wabaId: true,
          displayPhone: true,
          status: true,
        },
      },
    } satisfies Prisma.MessageTemplateInclude;
  }

  private requireTenant(tenantId?: string) {
    const resolvedTenantId = tenantId?.trim();

    if (!resolvedTenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    return resolvedTenantId;
  }

  private parseEnum<T extends string>(value: unknown, allowed: T[], fieldName: string): T | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const normalized = String(value).trim().toUpperCase() as T;

    if (!allowed.includes(normalized)) {
      throw new BadRequestException(`${fieldName} must be one of: ${allowed.join(', ')}`);
    }

    return normalized;
  }

  private normalizeLanguage(language?: string) {
    const normalized = language?.trim() || 'en_US';

    if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(normalized)) {
      throw new BadRequestException('language must look like en or en_US');
    }

    return normalized;
  }

  private normalizeTemplateName(value?: string) {
    const name = value
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 512);

    if (!name) {
      throw new BadRequestException('Template name is required');
    }

    return name;
  }

  private titleFromName(name: string) {
    return name
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private asJson(
    value: unknown,
  ): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return value as Prisma.InputJsonValue;
  }

  private async ensureWhatsappAccountBelongsToTenant(whatsappAccountId: string | undefined, tenantId: string) {
    if (!whatsappAccountId) return;

    const account = await this.prisma.whatsappAccount.findFirst({
      where: { id: whatsappAccountId, tenantId },
      select: { id: true },
    });

    if (!account) {
      throw new BadRequestException('WhatsApp account does not belong to this tenant');
    }
  }

  private isUniqueConstraint(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error as Prisma.PrismaClientKnownRequestError).code === 'P2002'
    );
  }

  private getMetaConfig(name: string) {
    const value = this.config.get<string>(name)?.trim();

    if (!value) {
      throw new BadRequestException(`${name} is required before submitting templates to Meta`);
    }

    return value;
  }

  private buildMetaTemplatePayload(template: Awaited<ReturnType<TemplatesService['findTemplate']>>) {
    const { text, variables } = this.toMetaBodyText(template.bodyText);
    const components: MetaTemplateComponent[] = [
      {
        type: 'BODY',
        text,
      },
    ];

    if (variables.length) {
      components[0].example = {
        body_text: [variables.map((variable) => this.exampleValueForVariable(variable, template.examples))],
      };
    }

    const buttons = this.normalizeButtons(template.buttons);

    if (buttons.length) {
      components.push({
        type: 'BUTTONS',
        buttons,
      });
    }

    return {
      name: this.normalizeTemplateName(template.name),
      language: template.language,
      category: template.category,
      components,
    };
  }

  private toMetaBodyText(bodyText: string) {
    const variables: string[] = [];
    const text = bodyText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, variableName: string) => {
      if (/^\d+$/.test(variableName)) {
        return match.replace(/\s+/g, '');
      }

      if (!variables.includes(variableName)) {
        variables.push(variableName);
      }

      return `{{${variables.indexOf(variableName) + 1}}}`;
    });

    return { text, variables };
  }

  private normalizeButtons(buttonsJson: Prisma.JsonValue) {
    if (!Array.isArray(buttonsJson)) return [];

    return buttonsJson
      .map((button) => {
        if (!button || typeof button !== 'object' || Array.isArray(button)) return null;

        const candidate = button as Record<string, unknown>;
        const text = String(candidate.text || '').trim();
        const url = String(candidate.url || '').trim();

        if (!text || !url) return null;

        return {
          type: 'URL' as const,
          text,
          url,
        };
      })
      .filter((button): button is { type: 'URL'; text: string; url: string } => Boolean(button));
  }

  private exampleValueForVariable(variable: string, examplesJson: Prisma.JsonValue) {
    if (examplesJson && typeof examplesJson === 'object' && !Array.isArray(examplesJson)) {
      const examples = examplesJson as Record<string, unknown>;
      const example = examples[variable];

      if (example !== undefined && example !== null && String(example).trim()) {
        return String(example);
      }
    }

    const defaults: Record<string, string> = {
      name: 'Ahmed',
      offer: '20% OFF',
      link: 'https://kevzaai.com/offer',
      date: '30 Sep',
      invoice_id: 'INV-1001',
    };

    return defaults[variable] || 'Sample value';
  }

  private toLocalTemplateCategory(
    metaCategory: string,
    fallback: WhatsappTemplateCategory,
  ): WhatsappTemplateCategory {
    const normalizedCategory = metaCategory.toUpperCase();

    if (normalizedCategory === WhatsappTemplateCategory.MARKETING) return WhatsappTemplateCategory.MARKETING;
    if (normalizedCategory === WhatsappTemplateCategory.UTILITY) return WhatsappTemplateCategory.UTILITY;
    if (normalizedCategory === WhatsappTemplateCategory.AUTHENTICATION) {
      return WhatsappTemplateCategory.AUTHENTICATION;
    }

    return fallback;
  }

  private toLocalTemplateStatus(metaStatus: string): TemplateStatus {
    const normalizedStatus = metaStatus.toUpperCase();

    if (normalizedStatus === TemplateStatus.APPROVED) return TemplateStatus.APPROVED;
    if (normalizedStatus === TemplateStatus.REJECTED) return TemplateStatus.REJECTED;
    if (normalizedStatus === TemplateStatus.PAUSED) return TemplateStatus.PAUSED;
    if (normalizedStatus === TemplateStatus.DISABLED) return TemplateStatus.DISABLED;
    return TemplateStatus.PENDING;
  }
}
