'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, Trash2, ShoppingCart } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface CartItem {
  product: {
    id: string
    name: string
    sellingPrice: number
  }
  quantity: number
  price: number
  discount: number
}

interface HeldSale {
  id: string
  name: string
  cart: CartItem[]
  discount: number
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  customerId?: string
  customerName?: string
  timestamp: number
}

interface HoldSalesModalProps {
  open: boolean
  onClose: () => void
  heldSales: HeldSale[]
  onResume: (sale: HeldSale) => void
  onDelete: (id: string) => void
  onHold: (name: string) => void
  currentCart: CartItem[]
}

export function HoldSalesModal({
  open,
  onClose,
  heldSales,
  onResume,
  onDelete,
  onHold,
  currentCart,
}: HoldSalesModalProps) {
  const t = useTranslations('pos.holdSales')
  const tCommon = useTranslations('actions')

  const [showHoldForm, setShowHoldForm] = useState(false)
  const [holdName, setHoldName] = useState('')

  const handleHold = () => {
    if (holdName.trim()) {
      onHold(holdName.trim())
      setHoldName('')
      setShowHoldForm(false)
      onClose()
    }
  }

  const calculateTotal = (sale: HeldSale) => {
    const subtotal = sale.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const discountAmount = sale.discountType === 'PERCENTAGE'
      ? (subtotal * sale.discount / 100)
      : sale.discount
    return Math.max(0, subtotal - discountAmount)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        {!showHoldForm ? (
          <div className="flex-1 overflow-y-auto space-y-3">
            {/* Hold Current Sale Button */}
            {currentCart.length > 0 && (
              <Button
                onClick={() => setShowHoldForm(true)}
                variant="outline"
                className="w-full"
              >
                <Clock className="h-4 w-4 mr-2" />
                {t('holdCurrentSale')}
              </Button>
            )}

            {/* Held Sales List */}
            {heldSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t('noHeldSales')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {heldSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="border rounded-lg p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium">{sale.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(sale.timestamp, 'MMM dd, yyyy HH:mm')}
                        </div>
                        {sale.customerName && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {t('customer')}: {sale.customerName}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="font-mono">
                          {formatCurrency(calculateTotal(sale))}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {sale.cart.length} {t('items')}
                        </div>
                      </div>
                    </div>

                    {/* Sale Items Preview */}
                    <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
                      {sale.cart.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate">
                            {item.quantity}x {item.product.name}
                          </span>
                          <span>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      {sale.cart.length > 3 && (
                        <div className="text-center">+{sale.cart.length - 3} {t('more')}</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          onResume(sale)
                          onClose()
                        }}
                        className="flex-1"
                      >
                        {t('resume')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(sale.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Hold Form */
          <div className="space-y-4">
            <div>
              <Label htmlFor="holdName">{t('saleName')}</Label>
              <Input
                id="holdName"
                value={holdName}
                onChange={(e) => setHoldName(e.target.value)}
                placeholder={t('saleNamePlaceholder')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleHold()
                }}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              {t('holdingSale')}: {currentCart.length} {t('items')}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowHoldForm(false)
                  setHoldName('')
                }}
                className="flex-1"
              >
                {tCommon('cancel')}
              </Button>
              <Button
                onClick={handleHold}
                disabled={!holdName.trim()}
                className="flex-1"
              >
                {t('hold')}
              </Button>
            </div>
          </div>
        )}

        {!showHoldForm && (
          <div className="pt-2 border-t">
            <Button variant="outline" onClick={onClose} className="w-full">
              {tCommon('close')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
