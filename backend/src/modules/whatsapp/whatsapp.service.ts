import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  getReadiness() {
    return {
      module: 'whatsapp',
      status: 'planned',
      owns: ['channel_accounts', 'templates', 'messages', 'webhooks'],
    };
  }
}
