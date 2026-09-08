'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun, PanelLeftClose, PanelLeftOpen, Menu, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/layout/notification-bell'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { usePrivacyStore } from '@/lib/stores/privacy-store'
import { useTranslations } from 'next-intl'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const isCollapsed = useSidebarStore((state) => state.isCollapsed)
  const toggleSidebar = useSidebarStore((state) => state.toggle)
  const openMobile = useSidebarStore((state) => state.openMobile)
  const hideNumbers = usePrivacyStore((state) => state.hideNumbers)
  const toggleHideNumbers = usePrivacyStore((state) => state.toggleHideNumbers)
  const t = useTranslations('common')

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground lg:hidden"
          onClick={openMobile}
          aria-label={t('openMenu')}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Desktop collapse button */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex h-8 w-8 text-muted-foreground"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>

        <div>
          <h1 className="text-sm font-semibold">{title}</h1>
          {description && <p className="text-xs text-muted-foreground hidden sm:block">{description}</p>}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={toggleHideNumbers}
          title={hideNumbers ? t('showNumbers') : t('hideNumbers')}
        >
          {hideNumbers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        <NotificationBell />
        <LanguageSwitcher />
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  )
}
