import { Controller, Get } from '@nestjs/common';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('readiness')
  getReadiness() {
    return this.tenantsService.getReadiness();
  }
}
