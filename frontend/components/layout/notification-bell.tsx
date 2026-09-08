'use client'

import { Bell, ShoppingCart, AlertTriangle, RotateCcw, Truck, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/auth-context'
import { getModuleForPath } from '@/lib/route-utils'
import type { Notification } from '@/types'

const iconByType: Record<string, typeof Info> = {
  sale: ShoppingCart,
  low_stock: AlertTriangle,
  refund: RotateCcw,
  transfer: Truck,
  cheque: Info,
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const router = useRouter()
  const t = useTranslations('notifications')
  const { hasPageAccess } = useAuth()

  const translateNotificationMessage = (message: string, type: string): string => {
    // Translate "New sale INV-XXX for XXX.XX DH" pattern
    const saleMatch = message.match(/New sale (INV-[A-Z0-9-]+) for ([\d,.]+) DH/)
    if (saleMatch && type === 'sale') {
      const [, invoice, amount] = saleMatch
      return t('messages.newSale', { invoice, amount })
    }

    // Translate "Low stock alert: PRODUCT_NAME (X left)" pattern
    const lowStockMatch = message.match(/Low stock alert: (.+) \((\d+) left\)/)
    if (lowStockMatch && type === 'low_stock') {
      const [, productName, quantity] = lowStockMatch
      return t('messages.lowStock', { product: productName, quantity })
    }

    // Return original message if no pattern matches
    return message
  }

  const handleSelect = (notification: Notification) => {
    if (!notification.read) markRead.mutate(notification.id)

    if (notification.targetRoute && notification.entityType) {
      const module = getModuleForPath(notification.targetRoute)
      if (module && !hasPageAccess(module)) return

      // If it's a sale notification, append the sale ID to the URL
      if (notification.entityType === 'sale' && notification.entityId) {
        router.push(`${notification.targetRoute}?saleId=${notification.entityId}`)
      } else {
        router.push(notification.targetRoute)
      }
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">{t('title')}</p>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('markAllRead')}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-hide">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">{t('noNotifications')}</div>
          ) : (
            notifications.map((notification) => {
              const Icon = iconByType[notification.type] ?? Info
              const isClickable = !!notification.targetRoute && notification.entityType
              return (
                <button
                  key={notification.id}
                  onClick={() => handleSelect(notification)}
                  className={cn(
                    'flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-accent',
                    !notification.read && 'bg-accent/40',
                    isClickable && 'cursor-pointer',
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{translateNotificationMessage(notification.message, notification.type)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
