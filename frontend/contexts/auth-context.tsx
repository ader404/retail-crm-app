'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getApiUrl } from '@/lib/runtime-config';
import { getFirstAllowedRoute } from '@/lib/route-utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isActive: boolean;
  mustChangePassword: boolean;
  locale?: string;
  pageAccess?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasPageAccess: (module: string) => boolean;
  getPageAccess: () => string[];
  getFirstAllowedRoute: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/change-password', '/no-access'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('access_token');

        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.clear();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Redirect logic
  useEffect(() => {
    if (loading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!user && !isPublicRoute) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      const firstRoute = getFirstAllowedRoute(hasPageAccess);
      router.replace(firstRoute);
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('session_token', data.session_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setUser(data.user);

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const sessionToken = localStorage.getItem('session_token');

      if (token && sessionToken) {
        await fetch(`${getApiUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ sessionToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.clear();
      setUser(null);
      router.push('/login');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    const rolePermissions = getRolePermissions(user.role);

    if (rolePermissions.includes('*')) {
      return true;
    }

    // Check for exact match
    if (rolePermissions.includes(permission)) {
      return true;
    }

    // Check for wildcard match (e.g., "sales.*" matches "sales.create")
    for (const perm of rolePermissions) {
      if (perm.endsWith('.*')) {
        const prefix = perm.slice(0, -2);
        if (permission.startsWith(prefix + '.')) {
          return true;
        }
      }
    }

    return false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((perm) => hasPermission(perm));
  };

  const getPageAccess = (): string[] => {
    if (!user) return [];
    if (user.role === 'SUPER_ADMIN') return [];
    if (!user.pageAccess) return [];
    try {
      const parsed = JSON.parse(user.pageAccess);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const hasPageAccess = (module: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    const pageAccess = getPageAccess();
    if (pageAccess.length === 0) return true;
    return pageAccess.includes(module);
  };

  const resolveFirstAllowedRoute = useCallback((): string => {
    return getFirstAllowedRoute(hasPageAccess);
  }, [hasPageAccess]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission,
    hasAnyPermission,
    hasPageAccess,
    getPageAccess,
    getFirstAllowedRoute: resolveFirstAllowedRoute,
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-border">
            <img
              src="/Logo.svg?v=2"
              alt="ADERUIX"
              className="w-12 h-12 object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-muted-foreground">...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to get role permissions
function getRolePermissions(role: string): string[] {
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
      'settings.view',
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
