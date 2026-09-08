'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Edit2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

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

interface EditCartItemModalProps {
  item: CartItem | null
  open: boolean
  onClose: () => void
  onSave: (itemId: string, updates: { quantity: number; price: number; discount: number; discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' }) => void
}

export function EditCartItemModal({ item, open, onClose, onSave }: EditCartItemModalProps) {
  const t = useTranslations('pos.editItem')
  const tCommon = useTranslations('actions')

  const [quantity, setQuantity] = useState(item?.quantity || 1)
  const [price, setPrice] = useState(item?.price || 0)
  const [discount, setDiscount] = useState(item?.discount || 0)
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE')

  // Update state when item changes
  useState(() => {
    if (item) {
      setQuantity(item.quantity)
      setPrice(item.price)
      setDiscount(item.discount)
    }
  })

  if (!item) return null

  const subtotal = price * quantity
  const discountAmount = discountType === 'PERCENTAGE' ? (subtotal * discount / 100) : discount
  const total = Math.max(0, subtotal - discountAmount)

  const handleSave = () => {
    onSave(item.product.id, { quantity, price, discount, discountType })
    onClose()
  }

  const handleReset = () => {
    setPrice(item.product.sellingPrice)
    setDiscount(0)
    setDiscountType('PERCENTAGE')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Name */}
          <div>
            <Label className="text-muted-foreground">{t('product')}</Label>
            <div className="font-medium mt-1">{item.product.name}</div>
          </div>

          {/* Quantity */}
          <div>
            <Label htmlFor="quantity">{t('quantity')}</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          {/* Unit Price */}
          <div>
            <Label htmlFor="price">{t('unitPrice')}</Label>
            <div className="flex gap-2">
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                size="sm"
              >
                {t('reset')}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('originalPrice')}: {formatCurrency(item.product.sellingPrice)}
            </div>
          </div>

          {/* Item Discount */}
          <div>
            <Label>{t('itemDiscount')}</Label>
            <div className="flex gap-2">
              <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">%</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">DH</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                step={discountType === 'PERCENTAGE' ? '1' : '0.01'}
                max={discountType === 'PERCENTAGE' ? '100' : subtotal}
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span>{t('subtotal')}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('discount')}</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>{t('lineTotal')}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
