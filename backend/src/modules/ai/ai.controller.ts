import { Controller, Get } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('readiness')
  getReadiness() {
    return this.aiService.getReadiness();
  }
}
