import { Injectable } from '@nestjs/common';

@Injectable()
export class KnowledgeService {
  getReadiness() {
    return {
      module: 'knowledge',
      status: 'planned',
      owns: ['sources', 'chunks', 'retrieval', 'grounded_answers'],
    };
  }
}
