import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  createContact(
    @Body()
    body: {
      tenantId?: string;
      name?: string;
      phoneE164?: string;
      email?: string;
      city?: string;
      source?: string;
      consent?: boolean;
      createLead?: boolean;
    },
  ) {
    return this.contactsService.createContact(body);
  }

  @Get()
  listContacts(@Query('tenantId') tenantId?: string) {
    return this.contactsService.listContacts(tenantId);
  }

  @Get('readiness')
  getReadiness() {
    return this.contactsService.getReadiness();
  }

  @Get(':id')
  getContact(@Param('id') id: string, @Query('tenantId') tenantId?: string) {
    return this.contactsService.getContact(id, tenantId);
  }
}
