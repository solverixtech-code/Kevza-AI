import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantsService {
  getReadiness() {
    return {
      module: 'tenants',
      status: 'planned',
      owns: ['organizations', 'workspaces', 'users', 'roles'],
    };
  }
}
