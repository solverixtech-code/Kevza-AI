import { Controller, Get } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get('readiness')
  getReadiness() {
    return this.campaignsService.getReadiness();
  }
}
