import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  getReadiness() {
    return {
      module: 'ai',
      status: 'planned',
      owns: ['intent', 'lead_scoring', 'reply_suggestions', 'agent_runs'],
    };
  }
}
