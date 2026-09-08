'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface ProductRow {
  id: string
  name: string
  sku: string
  categoryId: string
  costPrice: number
  sellingPrice: number
  quantity: number
}

interface Category {
  id: string
  name: string
}

interface Supplier {
  id: string
  companyName: string
}

export default function BulkProductPurchasePage() {
  const t = useTranslations('products')
  const router = useRouter()
  const [supplierId, setSupplierId] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [products, setProducts] = useState<ProductRow[]>([
    { id: '1', name: '', sku: '', categoryId: '', costPrice: 0, sellingPrice: 0, quantity: 0 }
  ])

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then(res => res.data)
  })

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers?limit=100').then(res => res.data.data || res.data)
  })

  const bulkPurchaseMutation = useMutation({
    mutationFn: (data: any) => api.post('/products/bulk-purchase', data),
    onSuccess: (response) => {
      toast.success(t('bulkPurchase.toasts.success'))

      const purchaseOrderId = response.data?.purchaseOrder?.id
      if (purchaseOrderId) {
        router.push(`/purchase-orders/${purchaseOrderId}`)
      } else {
        router.push('/products')
      }
    },
    onError: (e: any) => {
      const errorMsg = e.response?.data?.message
      toast.error(errorMsg ? `${t('bulkPurchase.toasts.failed')}: ${errorMsg}` : t('bulkPurchase.toasts.failed'))
    }
  })

  const addProductRow = () => {
    setProducts([
      ...products,
      { id: Date.now().toString(), name: '', sku: '', categoryId: '', costPrice: 0, sellingPrice: 0, quantity: 0 }
    ])
  }

  const removeProductRow = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id))
    }
  }

  const updateProduct = (id: string, field: keyof ProductRow, value: any) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const calculateTotalCost = () => {
    return products.reduce((sum, p) => sum + (p.costPrice * p.quantity), 0)
  }

  const calculateTotalItems = () => {
    return products.reduce((sum, p) => sum + p.quantity, 0)
  }

  const validateForm = () => {
    if (!supplierId) {
      toast.error(t('bulkPurchase.toasts.selectSupplier'))
      return false
    }

    const validProducts = products.filter(p =>
      p.name.trim() && p.sku.trim() && p.categoryId && p.costPrice > 0 && p.sellingPrice > 0 && p.quantity > 0
    )

    if (validProducts.length === 0) {
      toast.error(t('bulkPurchase.toasts.addValidProduct'))
      return false
    }

    return true
  }

  const handleSubmit = () => {
    if (!validateForm()) return

    const validProducts = products.filter(p =>
      p.name.trim() && p.sku.trim() && p.categoryId && p.costPrice > 0 && p.sellingPrice > 0 && p.quantity > 0
    )

    const payload = {
      supplierId,
      products: validProducts.map(p => ({
        name: p.name,
        sku: p.sku,
        categoryId: p.categoryId,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        quantity: p.quantity,
        barcode: undefined,
        brandId: undefined,
        description: undefined,
      })),
      tax: 0,
      amountPaid: 0,
      notes: notes.trim() || undefined
    }

    bulkPurchaseMutation.mutate(payload)
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('bulkPurchase.title')} />
      <div className="flex-1 p-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('bulkPurchase.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('bulkPurchase.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('bulkPurchase.generalInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">{t('bulkPurchase.supplier')} *</Label>
                <Select
                  value={supplierId}
                  onValueChange={setSupplierId}
                >
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder={t('bulkPurchase.selectSupplierPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedDelivery">{t('bulkPurchase.expectedDelivery')}</Label>
                <Input
                  id="expectedDelivery"
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t('bulkPurchase.notes')}</Label>
                <Textarea
                  id="notes"
                  placeholder={t('bulkPurchase.notesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>{t('bulkPurchase.productsCard')}</CardTitle>
                  <CardDescription>{t('bulkPurchase.productsCardDescription')}</CardDescription>
                </div>
                <Button onClick={addProductRow} size="sm" className="self-start sm:self-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('bulkPurchase.addProduct')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products.map((product, index) => (
                  <Card key={product.id} className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('bulkPurchase.productName')} #{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProductRow(product.id)}
                        disabled={products.length === 1}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${product.id}`}>{t('bulkPurchase.productName')} *</Label>
                        <Input
                          id={`name-${product.id}`}
                          value={product.name}
                          onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                          placeholder={t('bulkPurchase.productNamePlaceholder')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`sku-${product.id}`}>{t('bulkPurchase.sku')} *</Label>
                        <Input
                          id={`sku-${product.id}`}
                          value={product.sku}
                          onChange={(e) => updateProduct(product.id, 'sku', e.target.value)}
                          placeholder={t('bulkPurchase.skuPlaceholder')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`category-${product.id}`}>{t('bulkPurchase.category')} *</Label>
                        <Select
                          value={product.categoryId}
                          onValueChange={(value) => updateProduct(product.id, 'categoryId', value)}
                        >
                          <SelectTrigger id={`category-${product.id}`}>
                            <SelectValue placeholder={t('bulkPurchase.categoryPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`cost-${product.id}`}>{t('bulkPurchase.costPrice')} *</Label>
                        <Input
                          id={`cost-${product.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={product.costPrice || ''}
                          onChange={(e) => updateProduct(product.id, 'costPrice', parseFloat(e.target.value) || 0)}
                          placeholder={t('bulkPurchase.pricePlaceholder')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`selling-${product.id}`}>{t('bulkPurchase.sellingPrice')} *</Label>
                        <Input
                          id={`selling-${product.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={product.sellingPrice || ''}
                          onChange={(e) => updateProduct(product.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                          placeholder={t('bulkPurchase.pricePlaceholder')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${product.id}`}>{t('bulkPurchase.initialQuantity')} *</Label>
                        <Input
                          id={`quantity-${product.id}`}
                          type="number"
                          min="0"
                          value={product.quantity || ''}
                          onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder={t('bulkPurchase.quantityPlaceholder')}
                        />
                      </div>
                    </div>

                    {product.costPrice > 0 && product.quantity > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('bulkPurchase.subtotal')}:</span>
                          <span className="font-medium">
                            {formatCurrency(product.costPrice * product.quantity)}
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}

                {products.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('bulkPurchase.noProductsAdded')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>{t('bulkPurchase.summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('bulkPurchase.totalProducts')}:</span>
                  <span className="font-medium">{products.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('bulkPurchase.totalItems')}:</span>
                  <span className="font-medium">{calculateTotalItems()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">{t('bulkPurchase.totalCost')}:</span>
                  <span className="text-lg font-bold">{formatCurrency(calculateTotalCost())}</span>
                </div>
              </div>

              {supplierId && (
                <div className="pt-2 border-t text-sm text-muted-foreground space-y-1">
                  <p>✓ {t('bulkPurchase.poWillBeGenerated')}</p>
                  <p>✓ {t('bulkPurchase.supplierSelected')}</p>
                  {expectedDelivery && <p>✓ {t('bulkPurchase.deliveryDateSet')}</p>}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={bulkPurchaseMutation.isPending}
              >
                {bulkPurchaseMutation.isPending ? t('bulkPurchase.processing') : t('bulkPurchase.completePurchase')}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {t('bulkPurchase.footerNote')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
      </div>
    </div>
  )
}
