export const ROUTE_MODULE_MAP: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/pos': 'pos',
  '/products': 'products',
  '/categories': 'categories',
  '/customers': 'customers',
  '/suppliers': 'suppliers',
  '/sales': 'sales',
  '/cheques': 'cheques',
  '/expenses': 'expenses',
  '/loans': 'loans',
  '/employees': 'employees',
  '/reports': 'reports',
  '/settings': 'settings',
  '/notifications': 'notifications',
};

const ROUTE_PRIORITY = [
  '/dashboard',
  '/pos',
  '/sales',
  '/products',
  '/customers',
  '/suppliers',
  '/cheques',
  '/expenses',
  '/loans',
  '/employees',
  '/reports',
  '/settings',
  '/notifications',
  '/categories',
];

export function getModuleForPath(pathname: string): string | null {
  for (const [route, module] of Object.entries(ROUTE_MODULE_MAP)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return module;
    }
  }
  return null;
}

export function getFirstAllowedRoute(hasPageAccess: (module: string) => boolean): string {
  for (const route of ROUTE_PRIORITY) {
    const module = ROUTE_MODULE_MAP[route];
    if (hasPageAccess(module)) {
      return route;
    }
  }
  return '/no-access';
}
