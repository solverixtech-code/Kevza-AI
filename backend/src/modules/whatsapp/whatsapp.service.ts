import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type SaveWhatsappConnectionInput = {
  tenantId?: string;
  wabaId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  displayPhone?: string;
  qualityStatus?: string;
};

type MetaErrorPayload = {
  error?: {
    message?: string;
    error_user_title?: string;
    error_user_msg?: string;
    code?: number;
    fbtrace_id?: string;
  };
};

type MetaPhonePayload = MetaErrorPayload & {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
};

type MetaBusinessPayload = MetaErrorPayload & {
  id?: string;
  name?: string;
};

type MetaTemplatesPayload = MetaErrorPayload & {
  data?: Array<{
    id?: string;
    name?: string;
    status?: string;
    category?: string;
    language?: string;
  }>;
};

const META_PROVIDER = 'meta_cloud';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getReadiness() {
    return {
      module: 'whatsapp',
      status: 'in_progress',
      owns: ['channel_accounts', 'templates', 'messages', 'webhooks'],
      next: ['embedded_signup', 'campaign_sending', 'webhook_delivery_status'],
    };
  }

  async getConnection(tenantId?: string) {
    const account = await this.findTenantAccount(this.requireTenant(tenantId));

    if (!account) {
      return {
        connected: false,
        status: 'NOT_CONNECTED',
        provider: META_PROVIDER,
        guidance: this.getSetupGuidance(),
      };
    }

    return this.toConnectionResponse(account);
  }

  async saveConnection(input: SaveWhatsappConnectionInput) {
    const tenantId = this.requireTenant(input.tenantId);
    const existing = await this.findTenantAccount(tenantId);

    const wabaId = input.wabaId?.trim() || existing?.wabaId;
    const phoneNumberId = input.phoneNumberId?.trim() || existing?.phoneNumberId;
    const tokenCiphertext = input.accessToken?.trim() || existing?.tokenCiphertext;

    if (!wabaId) throw new BadRequestException('wabaId is required');
    if (!phoneNumberId) throw new BadRequestException('phoneNumberId is required');
    if (!tokenCiphertext) throw new BadRequestException('accessToken is required');

    const data = {
      provider: META_PROVIDER,
      wabaId,
      phoneNumberId,
      displayPhone: input.displayPhone?.trim() || existing?.displayPhone || null,
      qualityStatus: input.qualityStatus?.trim() || existing?.qualityStatus || null,
      tokenCiphertext,
      status: existing?.status === 'CONNECTED' ? 'CONNECTED' : 'CONFIGURED',
    };

    try {
      const account = existing
        ? await this.prisma.whatsappAccount.update({
            where: { id: existing.id },
            data,
          })
        : await this.prisma.whatsappAccount.create({
            data: {
              tenantId,
              ...data,
            },
          });

      return this.toConnectionResponse(account);
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException('This WhatsApp phone number is already connected to another workspace');
      }

      throw error;
    }
  }

  async testConnection(tenantId?: string) {
    const account = await this.requireTenantAccount(tenantId);
    const accessToken = this.requireAccessToken(account.tokenCiphertext);
    const graphVersion = this.getGraphVersion();

    const phoneParams = new URLSearchParams({
      fields: 'id,display_phone_number,verified_name,quality_rating,code_verification_status',
    });
    const businessParams = new URLSearchParams({ fields: 'id,name' });

    const [phone, business] = await Promise.all([
      this.metaGet<MetaPhonePayload>(
        `${graphVersion}/${account.phoneNumberId}?${phoneParams.toString()}`,
        accessToken,
        'Could not verify WhatsApp phone number',
      ),
      this.metaGet<MetaBusinessPayload>(
        `${graphVersion}/${account.wabaId}?${businessParams.toString()}`,
        accessToken,
        'Could not verify WhatsApp Business Account',
      ),
    ]);

    const updated = await this.prisma.whatsappAccount.update({
      where: { id: account.id },
      data: {
        status: 'CONNECTED',
        displayPhone: phone.display_phone_number || account.displayPhone,
        qualityStatus: phone.quality_rating || account.qualityStatus,
      },
    });

    return {
      ...this.toConnectionResponse(updated),
      meta: {
        business: {
          id: business.id,
          name: business.name,
        },
        phone: {
          id: phone.id,
          displayPhone: phone.display_phone_number,
          verifiedName: phone.verified_name,
          qualityRating: phone.quality_rating,
          codeVerificationStatus: phone.code_verification_status,
        },
      },
    };
  }

  async fetchMetaTemplates(tenantId?: string) {
    const account = await this.requireTenantAccount(tenantId);
    const accessToken = this.requireAccessToken(account.tokenCiphertext);
    const graphVersion = this.getGraphVersion();
    const params = new URLSearchParams({
      fields: 'id,name,status,category,language',
      limit: '100',
    });

    const payload = await this.metaGet<MetaTemplatesPayload>(
      `${graphVersion}/${account.wabaId}/message_templates?${params.toString()}`,
      accessToken,
      'Could not fetch WhatsApp templates from Meta',
    );

    return {
      whatsappAccountId: account.id,
      wabaId: account.wabaId,
      templates: payload.data || [],
    };
  }

  private async findTenantAccount(tenantId: string) {
    return this.prisma.whatsappAccount.findFirst({
      where: {
        tenantId,
        provider: META_PROVIDER,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async requireTenantAccount(tenantId?: string) {
    const account = await this.findTenantAccount(this.requireTenant(tenantId));

    if (!account) {
      throw new NotFoundException('Connect a WhatsApp Business account first');
    }

    if (!account.wabaId || !account.phoneNumberId) {
      throw new BadRequestException('WhatsApp connection is missing WABA ID or phone number ID');
    }

    return account;
  }

  private toConnectionResponse(account: Awaited<ReturnType<WhatsappService['findTenantAccount']>>) {
    if (!account) return null;

    return {
      id: account.id,
      connected: account.status === 'CONNECTED',
      provider: account.provider,
      wabaId: account.wabaId,
      phoneNumberId: account.phoneNumberId,
      displayPhone: account.displayPhone,
      status: account.status,
      qualityStatus: account.qualityStatus,
      tokenConfigured: Boolean(account.tokenCiphertext),
      tokenPreview: this.maskToken(account.tokenCiphertext),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      guidance: this.getSetupGuidance(),
    };
  }

  private async metaGet<T extends MetaErrorPayload>(path: string, accessToken: string, fallback: string) {
    const response = await fetch(`https://graph.facebook.com/${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as T;

    if (!response.ok || payload.error) {
      throw new HttpException(this.formatMetaError(payload, fallback), response.status || 502);
    }

    return payload;
  }

  private requireTenant(tenantId?: string) {
    const resolvedTenantId = tenantId?.trim();

    if (!resolvedTenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    return resolvedTenantId;
  }

  private requireAccessToken(token?: string | null) {
    if (!token) {
      throw new BadRequestException('WhatsApp access token is required');
    }

    return token;
  }

  private getGraphVersion() {
    return this.config.get<string>('META_GRAPH_VERSION') || 'v23.0';
  }

  private maskToken(token?: string | null) {
    if (!token) return null;
    if (token.length <= 12) return 'configured';

    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }

  private formatMetaError(payload: MetaErrorPayload, fallback: string) {
    const error = payload.error;
    if (!error) return fallback;

    const messageParts = [
      error.error_user_title,
      error.error_user_msg,
      error.message && error.message !== error.error_user_title ? error.message : null,
    ].filter(Boolean);

    return messageParts.length ? messageParts.join(': ') : fallback;
  }

  private isUniqueConstraint(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error as Prisma.PrismaClientKnownRequestError).code === 'P2002'
    );
  }

  private getSetupGuidance() {
    return {
      recommendedNumber: 'Use a dedicated WhatsApp Business number, not a daily personal WhatsApp number.',
      onboarding: 'Manual credentials now; Meta Embedded Signup later for customer self-serve onboarding.',
      requiredMetaPermissions: [
        'whatsapp_business_management',
        'whatsapp_business_messaging',
        'business_management',
      ],
    };
  }
}
