import { Controller, Get } from '@nestjs/common';
import { InboxService } from './inbox.service';

@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get('readiness')
  getReadiness() {
    return this.inboxService.getReadiness();
  }
}
