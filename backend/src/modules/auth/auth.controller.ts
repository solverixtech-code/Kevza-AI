import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
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

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.getCurrentUser(authorization);
  }
}
