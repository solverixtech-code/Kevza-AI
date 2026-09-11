import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CUSTOMER_ROLES, Roles } from '../auth/rbac/roles.decorator';
import type { AuthenticatedRequest } from '../auth/rbac/authenticated-user';
import { JwtAuthGuard } from '../auth/rbac/jwt-auth.guard';
import { RolesGuard } from '../auth/rbac/roles.guard';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CUSTOMER_ROLES)
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
    @Req() request: AuthenticatedRequest,
  ) {
    return this.contactsService.createContact({
      ...body,
      tenantId: request.user?.tenantId,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CUSTOMER_ROLES)
  listContacts(@Req() request: AuthenticatedRequest) {
    return this.contactsService.listContacts(request.user?.tenantId);
  }

  @Get('readiness')
  getReadiness() {
    return this.contactsService.getReadiness();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CUSTOMER_ROLES)
  getContact(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.contactsService.getContact(id, request.user?.tenantId);
  }
}
