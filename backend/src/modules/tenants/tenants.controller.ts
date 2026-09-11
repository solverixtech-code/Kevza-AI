import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { JwtAuthGuard } from '../auth/rbac/jwt-auth.guard';
import { Roles } from '../auth/rbac/roles.decorator';
import { RolesGuard } from '../auth/rbac/roles.guard';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  createTenant(@Body() body: { name?: string; timezone?: string; country?: string }) {
    return this.tenantsService.createTenant(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  listTenants() {
    return this.tenantsService.listTenants();
  }

  @Get('readiness')
  getReadiness() {
    return this.tenantsService.getReadiness();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  getTenant(@Param('id') id: string) {
    return this.tenantsService.getTenant(id);
  }
}
