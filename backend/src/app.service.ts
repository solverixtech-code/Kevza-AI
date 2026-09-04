import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot() {
    return {
      service: 'kevza-api',
      message: 'KevzaAI backend is running',
    };
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'kevza-api',
      version: '1.0.0',
    };
  }
}
