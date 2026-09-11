import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../../generated/prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const CUSTOMER_ROLES = [UserRole.OWNER, UserRole.TEAM_MEMBER] as const;
