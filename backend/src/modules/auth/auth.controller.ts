import { Body, Controller, Get, Headers, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body()
    body: {
      businessName?: string;
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      timezone?: string;
      country?: string;
    },
  ) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: { email?: string; password?: string }) {
    return this.authService.login(body);
  }

  @Post('verify-email-otp')
  verifyEmailOtp(@Body() body: { email?: string; code?: string }) {
    return this.authService.verifyEmailOtp(body);
  }

  @Post('resend-email-otp')
  resendEmailOtp(@Body() body: { email?: string }) {
    return this.authService.resendSignupOtp(body);
  }

  @Get('google')
  google(@Res() response: Response) {
    response.redirect(this.authService.getGoogleAuthUrl());
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    response.redirect(await this.authService.getGoogleCallbackRedirectUrl(code, error));
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.getCurrentUser(authorization);
  }
}
