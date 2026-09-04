import { Injectable } from '@nestjs/common';

@Injectable()
export class InboxService {
  getReadiness() {
    return {
      module: 'inbox',
      status: 'planned',
      owns: ['conversations', 'human_handoff', 'message_timeline'],
    };
  }
}
