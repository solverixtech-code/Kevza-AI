import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  tenantId: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: {
    businessName?: string;
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    timezone?: string;
    country?: string;
  }) {
    const businessName = input.businessName?.trim();
    const name = input.name?.trim();
    const email = this.normalizeEmail(input.email);
    const phone = input.phone?.trim() || null;
    const password = input.password;

    if (!businessName || !name || !email || !password) {
      throw new BadRequestException(
        'Business name, name, email, and password are required',
      );
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: businessName,
          timezone: input.timezone?.trim() || 'Asia/Kolkata',
          country: input.country?.trim() || 'IN',
        },
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          phone,
          passwordHash,
          role: UserRole.OWNER,
        },
      });

      return { tenant, user };
    });

    return this.createAuthResponse(user, tenant);
  }

  async login(input: { email?: string; password?: string }) {
    const email = this.normalizeEmail(input.email);
    const password = input.password;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findFirst({
      where: { email },
      include: { tenant: true },
    });

    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createAuthResponse(user, user.tenant);
  }

  async getCurrentUser(authorization?: string) {
    const token = this.getBearerToken(authorization);
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return {
      user: this.safeUser(user),
      tenant: this.safeTenant(user.tenant),
    };
  }

  private async createAuthResponse(
    user: {
      id: string;
      tenantId: string;
      email: string;
      name: string;
      phone?: string | null;
      role: UserRole;
    },
    tenant: { id: string; name: string; status: string; timezone: string; country: string },
  ) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    } satisfies JwtPayload);

    return {
      accessToken,
      tokenType: 'Bearer',
      user: this.safeUser(user),
      tenant: this.safeTenant(tenant),
    };
  }

  private safeUser(user: {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    role: UserRole;
    phone?: string | null;
  }) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      role: user.role,
    };
  }

  private safeTenant(tenant: {
    id: string;
    name: string;
    status: string;
    timezone: string;
    country: string;
  }) {
    return {
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      timezone: tenant.timezone,
      country: tenant.country,
    };
  }

  private normalizeEmail(email?: string) {
    const normalized = email?.trim().toLowerCase();

    if (normalized && !/^\S+@\S+\.\S+$/.test(normalized)) {
      throw new BadRequestException('A valid email is required');
    }

    return normalized;
  }

  private getBearerToken(authorization?: string) {
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Bearer access token is required');
    }

    return token;
  }
}
