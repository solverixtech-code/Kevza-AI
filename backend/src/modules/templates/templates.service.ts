import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

const ALLOWED_CATEGORIES = Object.values(WhatsappTemplateCategory) as WhatsappTemplateCategory[];
const ALLOWED_STATUSES = Object.values(TemplateStatus) as TemplateStatus[];
const ALLOWED_SOURCES = Object.values(TemplateSource) as TemplateSource[];

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
