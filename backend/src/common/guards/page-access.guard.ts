import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_ACCESS_MAP } from '../page-access.module-map';

export const PAGE_ACCESS_KEY = 'pageAccess';

@Injectable()
export class PageAccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredModules = this.reflector.getAllAndOverride<string[]>(
      PAGE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredModules || requiredModules.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const pageAccess: string[] = parsePageAccess(user.pageAccess);

    if (pageAccess.length === 0) {
      return true;
    }

    return requiredModules.some((mod) => pageAccess.includes(mod));
  }
}

export function parsePageAccess(pageAccess: string | null | undefined): string[] {
  if (!pageAccess) return []
  try {
    const parsed = JSON.parse(pageAccess)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function hasPageAccessForRoute(user: { role: string; pageAccess?: string | null }, pathname: string): boolean {
  if (user.role === 'SUPER_ADMIN') return true

  const pageAccess = parsePageAccess(user.pageAccess)
  if (pageAccess.length === 0) return true

  for (const moduleKey of pageAccess) {
    const mapping = MODULE_ACCESS_MAP[moduleKey]
    if (!mapping) continue
    for (const route of mapping.routes) {
      if (route.test(pathname)) return true
    }
  }

  return false
}

export function hasPageAccessForApi(user: { role: string; pageAccess?: string | null }, apiPath: string): boolean {
  if (user.role === 'SUPER_ADMIN') return true

  const pageAccess = parsePageAccess(user.pageAccess)
  if (pageAccess.length === 0) return true

  for (const moduleKey of pageAccess) {
    const mapping = MODULE_ACCESS_MAP[moduleKey]
    if (!mapping) continue
    for (const prefix of mapping.apiPrefixes) {
      if (apiPath.startsWith('/' + prefix) || apiPath === '/' + prefix) return true
    }
  }

  return false
}
