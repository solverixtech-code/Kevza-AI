import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  createTenant(@Body() body: { name?: string; timezone?: string; country?: string }) {
    return this.tenantsService.createTenant(body);
  }

  @Get()
  listTenants() {
    return this.tenantsService.listTenants();
  }

  @Get('readiness')
  getReadiness() {
    return this.tenantsService.getReadiness();
  }

  @Get(':id')
  getTenant(@Param('id') id: string) {
    return this.tenantsService.getTenant(id);
  }
}
