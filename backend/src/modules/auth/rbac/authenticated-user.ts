import type { Request } from 'express';
import { UserRole } from '../../../../generated/prisma/client';

export type AuthenticatedUser = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
