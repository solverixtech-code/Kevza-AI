import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async createContact(input: {
    tenantId?: string;
    name?: string;
    phoneE164?: string;
    email?: string;
    city?: string;
    source?: string;
    consent?: boolean;
    createLead?: boolean;
  }) {
    const tenantId = input.tenantId?.trim();
    const name = input.name?.trim();
    const phoneE164 = input.phoneE164?.trim() || null;
    const email = input.email?.trim().toLowerCase() || null;

    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    if (!name) {
      throw new BadRequestException('Contact name is required');
    }

    if (!phoneE164 && !email) {
      throw new BadRequestException('Phone or email is required');
    }

    const tenantExists = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenantExists) {
      throw new BadRequestException('Tenant does not exist');
    }

    return this.prisma.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data: {
          tenantId,
          name,
          phoneE164,
          email,
          city: input.city?.trim() || null,
          source: input.source?.trim() || 'manual',
          consent: input.consent ?? false,
        },
      });

      const shouldCreateLead = input.createLead ?? true;

      if (shouldCreateLead) {
        await tx.lead.create({
          data: {
            tenantId,
            contactId: contact.id,
          },
        });
      }

      return tx.contact.findFirst({
        where: { id: contact.id, tenantId },
        include: {
          leads: {
            select: {
              id: true,
              status: true,
              score: true,
              priority: true,
              nextActionAt: true,
            },
          },
        },
      });
    });
  }

  async listContacts(tenantId?: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId query parameter is required');
    }

    return this.prisma.contact.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        leads: {
          select: {
            id: true,
            status: true,
            score: true,
            priority: true,
            nextActionAt: true,
          },
        },
      },
    });
  }

  async getContact(id: string, tenantId?: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId query parameter is required');
    }

    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId },
      include: {
        leads: true,
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  getReadiness() {
    return {
      module: 'contacts',
      status: 'active',
      owns: ['contacts', 'leads', 'imports', 'consent'],
    };
  }
}
