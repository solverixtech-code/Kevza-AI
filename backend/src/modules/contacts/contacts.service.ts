import { Injectable } from '@nestjs/common';

@Injectable()
export class ContactsService {
  getReadiness() {
    return {
      module: 'contacts',
      status: 'planned',
      owns: ['contacts', 'leads', 'imports', 'consent'],
    };
  }
}
