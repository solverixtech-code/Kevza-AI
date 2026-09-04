import { Injectable } from '@nestjs/common';

@Injectable()
export class CampaignsService {
  getReadiness() {
    return {
      module: 'campaigns',
      status: 'planned',
      owns: ['audiences', 'campaigns', 'send_batches', 'eligibility'],
    };
  }
}
