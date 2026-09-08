'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ROUTE_MODULE_MAP, getModuleForPath } from '@/lib/route-utils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requireAll?: boolean;
}

export default function ProtectedRoute({
  children,
  requiredPermissions = [],
  requireAll = false,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, hasPermission, hasAnyPermission, hasPageAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.mustChangePassword) {
      router.push('/change-password');
      return;
    }

    // Check page access for current route
    const module = getModuleForPath(window.location.pathname);
    if (module && !hasPageAccess(module)) {
      router.push('/no-access');
      return;
    }

    if (requiredPermissions.length > 0) {
      const hasAccess = requireAll
        ? requiredPermissions.every((perm) => hasPermission(perm))
        : hasAnyPermission(requiredPermissions);

      if (!hasAccess) {
        router.push('/forbidden');
      }
    }
  }, [
    loading,
    isAuthenticated,
    user,
    requiredPermissions,
    requireAll,
    router,
    hasPermission,
    hasAnyPermission,
    hasPageAccess,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.mustChangePassword) {
    return null;
  }

  // Check page access for current route
  const module = getModuleForPath(window.location.pathname);
  if (module && !hasPageAccess(module)) {
    return null;
  }

  if (requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? requiredPermissions.every((perm) => hasPermission(perm))
      : hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      return null;
    }
  }

  return <>{children}</>;
}
