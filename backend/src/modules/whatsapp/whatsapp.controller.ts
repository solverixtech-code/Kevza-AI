import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/rbac/authenticated-user';
import { JwtAuthGuard } from '../auth/rbac/jwt-auth.guard';
import { CUSTOMER_ROLES, Roles } from '../auth/rbac/roles.decorator';
import { RolesGuard } from '../auth/rbac/roles.guard';
import { WhatsappService } from './whatsapp.service';

type SaveConnectionBody = {
  wabaId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  displayPhone?: string;
  qualityStatus?: string;
};

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('readiness')
  getReadiness() {
    return this.whatsappService.getReadiness();
  }

  @Get('connection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CUSTOMER_ROLES)
  getConnection(@Req() request: AuthenticatedRequest) {
    return this.whatsappService.getConnection(request.user?.tenantId);
  }

  @Put('connection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CUSTOMER_ROLES)
  saveConnection(@Body() body: SaveConnectionBody, @Req() request: AuthenticatedRequest) {
    return this.whatsappService.saveConnection({
      ...body,
      tenantId: request.user?.tenantId,
    });
  }

  @Post('connection/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CUSTOMER_ROLES)
  testConnection(@Req() request: AuthenticatedRequest) {
    return this.whatsappService.testConnection(request.user?.tenantId);
  }

  @Get('templates/meta')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CUSTOMER_ROLES)
  fetchMetaTemplates(@Req() request: AuthenticatedRequest) {
    return this.whatsappService.fetchMetaTemplates(request.user?.tenantId);
  }
}
