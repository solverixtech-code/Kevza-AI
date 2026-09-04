import { Controller, Get } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('readiness')
  getReadiness() {
    return this.knowledgeService.getReadiness();
  }
}
