import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { EmailOtpPurpose, UserRole } from '../../../generated/prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  tenantId: string;
  role: UserRole;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
};

const SIGNUP_OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
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
    const otpCode = this.generateOtpCode();
    const otpHash = await bcrypt.hash(otpCode, 12);
    const expiresAt = this.getOtpExpiry();

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

      await tx.emailOtp.create({
        data: {
          userId: user.id,
          email,
          purpose: EmailOtpPurpose.SIGNUP,
          codeHash: otpHash,
          expiresAt,
        },
      });

      return { tenant, user };
    });

    const delivery = await this.emailService.sendSignupOtp({
      to: user.email,
      name: user.name,
      code: otpCode,
      expiresInMinutes: SIGNUP_OTP_TTL_MINUTES,
    });

    return {
      requiresVerification: true,
      email: user.email,
      tenant: this.safeTenant(tenant),
      devOtp: this.shouldExposeDevelopmentOtp(delivery.sent) ? otpCode : undefined,
      otpDelivery: delivery.mode,
    };
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

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Please verify your email before signing in');
    }

    return this.createAuthResponse(user, user.tenant);
  }

  async verifyEmailOtp(input: { email?: string; code?: string }) {
    const email = this.normalizeEmail(input.email);
    const code = input.code?.trim();

    if (!email || !code) {
      throw new BadRequestException('Email and OTP code are required');
    }

    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Enter a valid 6-digit OTP code');
    }

    const otp = await this.prisma.emailOtp.findFirst({
      where: {
        email,
        purpose: EmailOtpPurpose.SIGNUP,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { include: { tenant: true } } },
    });

    if (!otp) {
      throw new BadRequestException('OTP code not found or already used');
    }

    if (otp.expiresAt <= new Date()) {
      throw new BadRequestException('OTP code has expired');
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException('Too many OTP attempts. Request a new code');
    }

    const isValidCode = await bcrypt.compare(code, otp.codeHash);

    if (!isValidCode) {
      await this.prisma.emailOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP code');
    }

    const { user } = await this.prisma.$transaction(async (tx) => {
      await tx.emailOtp.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      });

      const user = await tx.user.update({
        where: { id: otp.userId },
        data: { emailVerifiedAt: new Date() },
        include: { tenant: true },
      });

      return { user };
    });

    return this.createAuthResponse(user, user.tenant);
  }

  async resendSignupOtp(input: { email?: string }) {
    const email = this.normalizeEmail(input.email);

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true, email: true, emailVerifiedAt: true },
    });

    if (!user) {
      throw new BadRequestException('Account not found');
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email is already verified');
    }

    const otpCode = this.generateOtpCode();
    const otpHash = await bcrypt.hash(otpCode, 12);

    await this.prisma.emailOtp.create({
      data: {
        userId: user.id,
        email: user.email,
        purpose: EmailOtpPurpose.SIGNUP,
        codeHash: otpHash,
        expiresAt: this.getOtpExpiry(),
      },
    });

    const delivery = await this.emailService.sendSignupOtp({
      to: user.email,
      name: 'there',
      code: otpCode,
      expiresInMinutes: SIGNUP_OTP_TTL_MINUTES,
    });

    return {
      sent: true,
      email: user.email,
      devOtp: this.shouldExposeDevelopmentOtp(delivery.sent) ? otpCode : undefined,
      otpDelivery: delivery.mode,
    };
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

  getGoogleAuthUrl() {
    const clientId = this.getGoogleClientId();
    const callbackUrl = this.getGoogleCallbackUrl();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async getGoogleCallbackRedirectUrl(code?: string, error?: string) {
    if (error) {
      return this.getFrontendAuthCallbackUrl({ error });
    }

    if (!code) {
      return this.getFrontendAuthCallbackUrl({ error: 'Google login was cancelled' });
    }

    try {
      const token = await this.exchangeGoogleCode(code);
      const profile = await this.getGoogleProfile(token);
      const authResponse = await this.upsertGoogleUser(profile);

      return this.getFrontendAuthCallbackUrl({
        accessToken: authResponse.accessToken,
        tokenType: authResponse.tokenType,
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to complete Google login';
      return this.getFrontendAuthCallbackUrl({ error: message });
    }
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

  private async exchangeGoogleCode(code: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.getGoogleClientId(),
        client_secret: this.getGoogleClientSecret(),
        redirect_uri: this.getGoogleCallbackUrl(),
        grant_type: 'authorization_code',
      }),
    });
    const payload = (await response.json()) as GoogleTokenResponse;

    if (!response.ok || !payload.access_token) {
      throw new UnauthorizedException(
        payload.error_description || payload.error || 'Google token exchange failed',
      );
    }

    return payload.access_token;
  }

  private async getGoogleProfile(accessToken: string) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = (await response.json()) as GoogleUserInfo;
    const email = this.normalizeEmail(profile.email);

    if (!response.ok || !email) {
      throw new UnauthorizedException('Unable to read Google account profile');
    }

    if (!profile.email_verified) {
      throw new UnauthorizedException('Google email is not verified');
    }

    return {
      email,
      name: profile.name?.trim() || email.split('@')[0],
    };
  }

  private async upsertGoogleUser(profile: { email: string; name: string }) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: profile.email },
      include: { tenant: true },
    });

    if (existingUser) {
      const user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: existingUser.name || profile.name,
          emailVerifiedAt: existingUser.emailVerifiedAt || new Date(),
        },
        include: { tenant: true },
      });

      return this.createAuthResponse(user, user.tenant);
    }

    const { user, tenant } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: `${profile.name} Workspace`,
          timezone: 'Asia/Kolkata',
          country: 'IN',
        },
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: profile.email,
          name: profile.name,
          emailVerifiedAt: new Date(),
          role: UserRole.OWNER,
        },
      });

      return { user, tenant };
    });

    return this.createAuthResponse(user, tenant);
  }

  private safeUser(user: {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    role: UserRole;
    phone?: string | null;
    emailVerifiedAt?: Date | null;
  }) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
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

  private generateOtpCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private getOtpExpiry() {
    return new Date(Date.now() + SIGNUP_OTP_TTL_MINUTES * 60 * 1000);
  }

  private shouldExposeDevelopmentOtp(wasSent: boolean) {
    return !wasSent && process.env.NODE_ENV !== 'production';
  }

  private getGoogleClientId() {
    return this.getRequiredConfig('GOOGLE_CLIENT_ID');
  }

  private getGoogleClientSecret() {
    return this.getRequiredConfig('GOOGLE_CLIENT_SECRET');
  }

  private getGoogleCallbackUrl() {
    return (
      this.config.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3000/api/v1/auth/google/callback'
    );
  }

  private getFrontendUrl() {
    return this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  private getRequiredConfig(key: string) {
    const value = this.config.get<string>(key);

    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }

    return value;
  }

  private getFrontendAuthCallbackUrl(input: {
    accessToken?: string;
    tokenType?: string;
    error?: string;
  }) {
    const callbackUrl = new URL('/auth-callback.html', this.getFrontendUrl());
    const hash = new URLSearchParams();

    if (input.accessToken) {
      hash.set('accessToken', input.accessToken);
    }

    if (input.tokenType) {
      hash.set('tokenType', input.tokenType);
    }

    if (input.error) {
      hash.set('error', input.error);
    }

    callbackUrl.hash = hash.toString();
    return callbackUrl.toString();
  }
}
