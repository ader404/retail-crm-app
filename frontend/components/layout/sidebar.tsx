'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { useAuth } from '@/contexts/auth-context'
import { useTranslations } from 'next-intl'
import { X, LogOut } from 'lucide-react'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  DollarSign,
  UserCog,
  Truck,
  BarChart3,
  Settings,
  Store,
  HandCoins,
  Landmark,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', labelKey: 'navigation.dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { href: '/pos', labelKey: 'navigation.pos', icon: ShoppingCart, module: 'pos' },
  { href: '/products', labelKey: 'navigation.products', icon: Package, module: 'products' },
  { href: '/customers', labelKey: 'navigation.customers', icon: Users, module: 'customers' },
  { href: '/sales', labelKey: 'navigation.sales', icon: Receipt, module: 'sales' },
  { href: '/cheques', labelKey: 'navigation.cheques', icon: Landmark, module: 'cheques' },
  { href: '/expenses', labelKey: 'navigation.expenses', icon: DollarSign, module: 'expenses' },
  { href: '/loans', labelKey: 'navigation.loans', icon: HandCoins, module: 'loans' },
  { href: '/employees', labelKey: 'navigation.employees', icon: UserCog, module: 'employees' },
  { href: '/suppliers', labelKey: 'navigation.suppliers', icon: Truck, module: 'suppliers' },
  { href: '/reports', labelKey: 'navigation.reports', icon: BarChart3, module: 'reports' },
  { href: '/settings', labelKey: 'navigation.settings', icon: Settings, module: 'settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const isCollapsed = useSidebarStore((state) => state.isCollapsed)
  const isMobileOpen = useSidebarStore((state) => state.isMobileOpen)
  const closeMobile = useSidebarStore((state) => state.closeMobile)
  const { user, logout, hasPageAccess } = useAuth()
  const t = useTranslations()

  const visibleNavItems = navItems.filter((item) => hasPageAccess(item.module))

  const getRoleLabel = (role: string) => {
    return t(`userRole.${role}` as any) || role
  }

  const handleLogout = async () => {
    await logout()
    closeMobile()
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200',
          // Desktop
          'hidden lg:flex',
          isCollapsed ? 'lg:w-16' : 'lg:w-60',
          // Mobile
          'lg:relative fixed inset-y-0 left-0 z-50',
          isMobileOpen ? 'flex w-60' : 'hidden lg:flex',
        )}
      >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="h-7 w-7 shrink-0 bg-white rounded-lg flex items-center justify-center p-0.9 shadow-sm">
          <img src="/Logo.svg?v=2" alt="ADERUIX" className="w-full h-full object-cover" style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }} />
        </div>
        {!isCollapsed && (
          <span className="truncate text-sm font-semibold text-sidebar-foreground">ADERUIX</span>
        )}
        {/* Mobile close button */}
        <button
          onClick={closeMobile}
          className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        <ul className="space-y-0.5 px-2">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMobile}
                  title={isCollapsed ? t(item.labelKey as any) : undefined}
                  className={cn(
                    'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    isCollapsed && 'justify-center lg:justify-center',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-md bg-sidebar-accent"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="relative z-10 truncate">{t(item.labelKey as any)}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom user area */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className={cn('flex items-center gap-2.5 rounded-md px-2 py-1.5', isCollapsed && 'lg:justify-center')}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{getRoleLabel(user?.role || '')}</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('actions.logout')}</span>
          </button>
        )}
        {isCollapsed && (
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-full flex items-center justify-center rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
          </button>
        )}
      </div>
    </aside>
    </>
  )
}
