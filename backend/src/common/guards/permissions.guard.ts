import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    return this.hasPermissions(user.role, requiredPermissions);
  }

  private hasPermissions(role: string, required: string[]): boolean {
    const rolePermissions = this.getRolePermissions(role);

    if (rolePermissions.includes('*')) {
      return true;
    }

    return required.every((perm) => this.matchesPermission(perm, rolePermissions));
  }

  private matchesPermission(required: string, available: string[]): boolean {
    for (const perm of available) {
      if (perm === '*') return true;

      if (perm.endsWith('.*')) {
        const prefix = perm.slice(0, -2);
        if (required.startsWith(prefix + '.')) return true;
      }

      if (perm === required) return true;
    }
    return false;
  }

  private getRolePermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
      SUPER_ADMIN: ['*'],

      ADMIN: [
        'sales.*',
        'customers.*',
        'suppliers.*',
        'products.*',
        'inventory.*',
        'expenses.*',
        'reports.*',
        'loans.*',
        'payments.*',
        'users.view',
        'users.create',
        'users.edit',
        'settings.view',
        'settings.edit',
        'cheques.*',
      ],

      MANAGER: [
        'sales.*',
        'customers.*',
        'suppliers.*',
        'products.view',
        'products.edit',
        'inventory.view',
        'reports.*',
        'loans.*',
        'payments.*',
        'expenses.view',
        'expenses.create',
        'cheques.*',
      ],

      CASHIER: [
        'sales.create',
        'sales.view',
        'customers.view',
        'customers.edit',
        'customers.create',
        'products.view',
        'payments.create',
        'payments.view',
        'cheques.view',
        'cheques.create',
      ],

      SALES: [
        'sales.*',
        'customers.*',
        'products.view',
        'payments.create',
        'payments.view',
        'reports.view',
        'cheques.view',
      ],

      WAREHOUSE: [
        'products.*',
        'inventory.*',
        'suppliers.view',
        'suppliers.edit',
        'reports.view',
      ],

      ACCOUNTANT: [
        'reports.*',
        'expenses.*',
        'sales.view',
        'customers.view',
        'suppliers.view',
        'loans.*',
        'payments.*',
        'cheques.*',
      ],
    };

    return permissions[role] || [];
  }
}
