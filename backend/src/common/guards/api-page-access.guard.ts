import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MODULE_ACCESS_MAP, ALL_MODULE_KEYS } from '../page-access.module-map';
import { parsePageAccess } from './page-access.guard';
import * as jwt from 'jsonwebtoken';

const EXEMPT_PREFIXES = ['/auth', '/shop-settings']

@Injectable()
export class ApiPageAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const path = request.path

    for (const prefix of EXEMPT_PREFIXES) {
      if (path.startsWith(prefix)) return true
    }

    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) return true

    const token = authHeader.slice(7)
    if (!token) return true

    try {
      const payload = jwt.decode(token) as any
      if (!payload || !payload.role) return true

      if (payload.role === 'SUPER_ADMIN') return true

      const pageAccess = parsePageAccess(payload.pageAccess)
      if (pageAccess.length === 0) return true

      const apiPath = path.replace(/^\/api\//, '/')

      for (const moduleKey of ALL_MODULE_KEYS) {
        if (pageAccess.includes(moduleKey)) continue

        const mapping = MODULE_ACCESS_MAP[moduleKey]
        if (!mapping) continue

        for (const prefix of mapping.apiPrefixes) {
          if (apiPath === '/' + prefix || apiPath.startsWith('/' + prefix + '/')) {
            throw new ForbiddenException(`Access denied: requires ${moduleKey} module access`)
          }
        }
      }

      return true
    } catch (e) {
      if (e instanceof ForbiddenException) throw e
      return true
    }
  }
}
