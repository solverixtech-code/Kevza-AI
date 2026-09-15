import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  TemplateSource,
  TemplateStatus,
  WhatsappTemplateCategory,
} from '../../../generated/prisma/client';
import type { AuthenticatedRequest } from '../auth/rbac/authenticated-user';
import { JwtAuthGuard } from '../auth/rbac/jwt-auth.guard';
import { CUSTOMER_ROLES, Roles } from '../auth/rbac/roles.decorator';
import { RolesGuard } from '../auth/rbac/roles.guard';
import { TemplatesService } from './templates.service';

type TemplateBody = {
  name?: string;
  displayName?: string;
  category?: WhatsappTemplateCategory;
  language?: string;
  bodyText?: string;
  components?: unknown;
  variables?: unknown;
  examples?: unknown;
  buttons?: unknown;
  source?: TemplateSource;
  status?: TemplateStatus;
  whatsappAccountId?: string;
};

@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CUSTOMER_ROLES)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  listTemplates(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: TemplateStatus,
    @Query('category') category?: WhatsappTemplateCategory,
    @Query('search') search?: string,
  ) {
    return this.templatesService.listTemplates({
      tenantId: request.user?.tenantId,
      status,
      category,
      search,
    });
  }

  @Post()
  createTemplate(@Body() body: TemplateBody, @Req() request: AuthenticatedRequest) {
    return this.templatesService.createTemplate({
      ...body,
      tenantId: request.user?.tenantId,
      createdById: request.user?.id,
    });
  }

  @Get(':id')
  getTemplate(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.templatesService.getTemplate(id, request.user?.tenantId);
  }

  @Patch(':id')
  updateTemplate(
    @Param('id') id: string,
    @Body() body: TemplateBody,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.templatesService.updateTemplate(id, request.user?.tenantId, body);
  }

  @Delete(':id')
  deleteTemplate(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.templatesService.deleteTemplate(id, request.user?.tenantId);
  }
}
