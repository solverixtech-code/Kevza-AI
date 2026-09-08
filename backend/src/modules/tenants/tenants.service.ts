import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTenant(input: {
    name?: string;
    timezone?: string;
    country?: string;
  }) {
    const name = input.name?.trim();

    if (!name) {
      throw new BadRequestException('Tenant name is required');
    }

    return this.prisma.tenant.create({
      data: {
        name,
        timezone: input.timezone?.trim() || 'Asia/Kolkata',
        country: input.country?.trim() || 'IN',
      },
    });
  }

  async listTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        timezone: true,
        country: true,
        createdAt: true,
        _count: {
          select: {
            contacts: true,
            leads: true,
            campaigns: true,
            conversations: true,
          },
        },
      },
    });
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            contacts: true,
            leads: true,
            campaigns: true,
            conversations: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  getReadiness() {
    return {
      module: 'tenants',
      status: 'active',
      owns: ['organizations', 'workspaces', 'users', 'roles'],
    };
  }
}
