'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, X, Package, ScanBarcode, User, Clock, Edit2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BarcodeScannerDialog } from '@/components/barcode/barcode-scanner-dialog'
import { CustomerSelectionModal } from '@/components/pos/customer-selection-modal'
import { EditCartItemModal } from '@/components/pos/edit-cart-item-modal'
import { HoldSalesModal } from '@/components/pos/hold-sales-modal'
import { AuthImage } from '@/components/ui/auth-image'
import { useAuth } from '@/contexts/auth-context'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { ReceiptDialog } from '@/components/receipt/receipt-dialog'
import type { ReceiptSale } from '@/components/receipt/receipt-content'

interface Product {
  id: string; name: string; sku: string; barcode?: string; sellingPrice: number; costPrice: number; imageUrl?: string
  category: { name: string }; brand?: { name: string }
  inventory?: { quantity: number } | null; trackImei?: boolean
}
interface Customer { id: string; name: string; phone?: string }
interface CartItem { product: Product; quantity: number; price: number; discount: number; imeiDeviceIds?: string[]; imeiNumbers?: string[] }

export default function POSPage() {
  const t = useTranslations('pos')
  const { user } = useAuth()
  const PAYMENT_METHODS = [
    { value: 'CASH', label: t('payment.methods.cash'), icon: Banknote },
    { value: 'CARD', label: t('payment.methods.card'), icon: CreditCard },
    { value: 'BANK_TRANSFER', label: t('payment.methods.bankTransfer'), icon: CreditCard },
    { value: 'QR', label: t('payment.methods.qr'), icon: ScanBarcode },
  ]
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [cashReceived, setCashReceived] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)
  const [holdSalesOpen, setHoldSalesOpen] = useState(false)
  const [heldSales, setHeldSales] = useState<any[]>([])
  const [imeiDialogProduct, setImeiDialogProduct] = useState<Product | null>(null)
  const [availableImeis, setAvailableImeis] = useState<any[]>([])
  const [selectedImeis, setSelectedImeis] = useState<string[]>([])
  const [imeiInput, setImeiInput] = useState('')

  // Load held sales from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pos-held-sales')
    if (saved) {
      try {
        setHeldSales(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load held sales:', e)
      }
    }
  }, [])

  // Save held sales to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pos-held-sales', JSON.stringify(heldSales))
  }, [heldSales])

  // Auto-set logged-in user as cashier
  useEffect(() => {
    if (user?.id && !userId) {
      setUserId(user.id)
    }
  }, [user, userId])

  // Fetch all data without pagination for POS (pass high limit)
  const { data: productsData, isLoading: productsLoading } = useQuery<any>({
    queryKey: ['pos-products'],
    queryFn: () => api.get('/products?limit=1000').then(r => r.data)
  })
  const products = productsData?.data || []

  const { data: customersData } = useQuery<any>({
    queryKey: ['customers-all'],
    queryFn: () => api.get('/customers?limit=100').then(r => r.data)
  })
  const customers = customersData?.data || []

  const { data: usersData } = useQuery<any>({
    queryKey: ['users-all'],
    queryFn: () => api.get('/users?limit=100').then(r => r.data)
  })
  const users = usersData || []

  const { data: categoriesData } = useQuery<any>({
    queryKey: ['categories-all'],
    queryFn: () => api.get('/products/categories').then(r => r.data)
  })
  const categories = categoriesData || []

  const { data: brandsData } = useQuery<any>({
    queryKey: ['brands-all'],
    queryFn: () => api.get('/products/brands').then(r => r.data)
  })
  const brands = brandsData || []

  const saleMutation = useMutation({
    mutationFn: (data: any) => api.post('/sales', data),
    onSuccess: (res) => {
      toast.success(t('toast.saleCompleted', { invoiceNumber: res.data.invoiceNumber }))
      setCart([]); setDiscount(0); setDiscountType('PERCENTAGE'); setCustomerId(''); setSelectedCustomer(null); setPaymentOpen(false); setCashReceived(''); setAmountPaid('')
      setReceiptSale(res.data)
      queryClient.invalidateQueries({ queryKey: ['pos-products'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toast.saleFailed')),
  })

  const filtered = products.filter((p: any) => {
    // Search filter
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? '').toLowerCase().includes(search.toLowerCase())

    // Category filter
    const matchesCategory = selectedCategory === 'all' || p.category?.id === selectedCategory

    // Brand filter
    const matchesBrand = selectedBrand === 'all' || p.brand?.id === selectedBrand

    return matchesSearch && matchesCategory && matchesBrand
  })

  function getStock(p: Product) {
    // For products that track IMEI, use the count of available IMEI devices
    if (p.trackImei && p._count?.imeiDevices !== undefined) {
      return p._count.imeiDevices
    }
    // Otherwise use inventory quantity
    return p.inventory?.quantity ?? 0
  }

async function handleBarcode(code: string) {
    const trimmed = code.trim()
    if (!trimmed) return
    if (/^\d{15}$/.test(trimmed)) {
      try {
        const { data: devices } = await api.get(`/imei/search?q=${encodeURIComponent(trimmed)}`)
        if (devices && Array.isArray(devices) && devices.length > 0) {
          const available = devices.find((d: any) => d.status === 'AVAILABLE')
          if (available) {
            const product = products.find((p: any) => p.id === available.productId)
            if (product) {
              setCart(prev => [...prev, { product, quantity: 1, price: product.sellingPrice, discount: 0, imeiDeviceIds: [available.id], imeiNumbers: [available.imei] }])
              setSearch('')
              return
            }
          } else {
            toast.error(t('toast.imeiAlreadySold'))
            setSearch('')
            return
          }
        }
      } catch {}
    }
    const local = products.find((p: any) => p.barcode === trimmed || p.sku === trimmed)
    if (local) { addToCart(local); setSearch(''); return }
    try {
      const { data } = await api.get<Product | null>(`/products/barcode/${encodeURIComponent(trimmed)}`)
      if (data) { addToCart(data); setSearch('') } else { toast.error(t('toast.barcodeNotFound', { code: trimmed })) }
    } catch {
      toast.error(t('toast.barcodeNotFound', { code: trimmed }))
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && search.trim()) {
      e.preventDefault()
      handleBarcode(search)
    }
  }

  async function handleImeiLookup() {
    const imei = imeiInput.trim()
    if (!imei || imei.length !== 15) { toast.error(t('imeiDialog.invalidImei')); return }
    try {
      const result = await api.get(`/imei/search?q=${imei}`)
      const devices = result.data
      if (!devices || devices.length === 0) { toast.error(t('imeiDialog.deviceNotFound')); return }
      const available = devices.find((d: any) => d.status === 'AVAILABLE')
      if (!available) { toast.error(t('imeiDialog.alreadySold')); return }
      const product = products.find((p: any) => p.id === available.productId)
      if (!product) { toast.error(t('imeiDialog.productNotFound')); return }
      addToCart(product, available.id, available.imei)
      setImeiInput('')
    } catch (e) {
      toast.error(t('toast.imeiFetchFailed'))
    }
  }

  function addToCart(product: Product, imeiDeviceId?: string, imeiNumber?: string) {
    if (product.trackImei && !imeiDeviceId) {
      setImeiDialogProduct(product)
      setSelectedImeis([])
      api.get(`/imei/product/${product.id}/available`).then(res => {
        setAvailableImeis(res.data || [])
      }).catch(() => {
        setAvailableImeis([])
        toast.error(t('toast.imeiFetchFailed'))
      })
      return
    }
    const stock = getStock(product)
    const existing = cart.find(i => i.product.id === product.id)
    const currentQty = existing?.quantity ?? 0
    if (currentQty >= stock) { toast.error(t('toast.noMoreStock')); return }
    setCart(prev => {
      if (existing) {
        if (product.trackImei && imeiDeviceId) {
          return [...prev, { product, quantity: 1, price: product.sellingPrice, discount: 0, imeiDeviceIds: [imeiDeviceId], imeiNumbers: imeiNumber ? [imeiNumber] : [] }]
        }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1, price: product.sellingPrice, discount: 0, ...(imeiDeviceId ? { imeiDeviceIds: [imeiDeviceId], imeiNumbers: imeiNumber ? [imeiNumber] : [] } : {}) }]
    })
  }

  function handleImeiConfirm() {
    if (!imeiDialogProduct || selectedImeis.length === 0) return
    const product = imeiDialogProduct
    const selectedNumbers = availableImeis
      .filter((d: any) => selectedImeis.includes(d.id))
      .map((d: any) => d.imei)
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        const mergedImeis = [...(existing.imeiDeviceIds || []), ...selectedImeis]
        const mergedNumbers = [...(existing.imeiNumbers || []), ...selectedNumbers]
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: mergedImeis.length, imeiDeviceIds: mergedImeis, imeiNumbers: mergedNumbers } : i)
      }
      return [...prev, { product, quantity: selectedImeis.length, price: product.sellingPrice, discount: 0, imeiDeviceIds: selectedImeis, imeiNumbers: selectedNumbers }]
    })
    setImeiDialogProduct(null)
    setSelectedImeis([])
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
  }

  function updatePrice(id: string, price: number) {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, price } : i))
  }

  function removeFromCart(id: string) { setCart(prev => prev.filter(i => i.product.id !== id)) }

  function handleEditItem(item: CartItem) {
    setEditingItem(item)
  }

  function handleSaveEditedItem(itemId: string, updates: { quantity: number; price: number; discount: number; discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' }) {
    setCart(prev => prev.map(i => {
      if (i.product.id === itemId) {
        return {
          ...i,
          quantity: updates.quantity,
          price: updates.price,
          discount: updates.discount
        }
      }
      return i
    }))
    setEditingItem(null)
  }

  function handleHoldSale(name: string) {
    const newHeldSale = {
      id: `held-${Date.now()}`,
      name,
      cart,
      discount,
      discountType,
      customerId,
      customerName: selectedCustomer?.name,
      timestamp: Date.now()
    }
    setHeldSales(prev => [...prev, newHeldSale])
    setCart([])
    setDiscount(0)
    setDiscountType('PERCENTAGE')
    setCustomerId('')
    setSelectedCustomer(null)
    toast.success(t('toast.saleHeld'))
  }

  function handleResumeSale(sale: any) {
    setCart(sale.cart)
    setDiscount(sale.discount)
    setDiscountType(sale.discountType)
    if (sale.customerId) {
      setCustomerId(sale.customerId)
      setSelectedCustomer({ id: sale.customerId, name: sale.customerName })
    }
    setHeldSales(prev => prev.filter(s => s.id !== sale.id))
    toast.success(t('toast.saleResumed'))
  }

  function handleDeleteHeldSale(id: string) {
    setHeldSales(prev => prev.filter(s => s.id !== id))
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const discountAmount = discountType === 'PERCENTAGE' ? (subtotal * discount / 100) : discount
  const total = Math.max(0, subtotal - discountAmount)
  const paidAmount = amountPaid ? Number(amountPaid) : (paymentMethod === 'CASH' && cashReceived ? Number(cashReceived) : total)
  const change = paymentMethod === 'CASH' ? Math.max(0, Number(cashReceived) - total) : 0
  const amountDue = Math.max(0, total - paidAmount)

  function handleCheckout() {
    if (cart.length === 0) { toast.error(t('toast.cartEmpty')); return }
    if (!userId) { toast.error(t('toast.selectCashierFirst')); return }

    const finalAmountPaid = amountPaid ? Number(amountPaid) : (paymentMethod === 'CASH' && cashReceived ? Number(cashReceived) : total)

    saleMutation.mutate({
      userId,
      customerId: (customerId && customerId !== 'walkin') ? customerId : undefined,
      paymentMethod,
      discount: discountType === 'PERCENTAGE' ? discount : discountAmount,
      discountType,
      amountPaid: Math.min(finalAmountPaid, total),
      items: cart.map(i => ({ productId: i.product.id, quantity: i.imeiDeviceIds?.length || i.quantity, costPrice: i.product.costPrice, sellingPrice: i.price, discount: i.discount, imeiDeviceIds: i.imeiDeviceIds })),
    })
  }

  return (
    <div className="flex flex-col flex-1 h-full">
      <Header title={t('title')} />
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Left — product grid */}
        <div className="flex flex-col flex-1 lg:border-r overflow-hidden">
          <div className="p-3 md:p-4 border-b space-y-3">
            {/* Customer Selection */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomerModalOpen(true)}
              className="w-full justify-start h-10"
            >
              <User className="h-4 w-4 mr-2 shrink-0" />
              {selectedCustomer ? (
                <span className="truncate font-medium">{selectedCustomer.name}</span>
              ) : (
                <span className="text-muted-foreground">{t('filters.walkInCustomer')}</span>
              )}
            </Button>

            {/* Search and Filters - Compact Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search.placeholder')}
                  className="pl-9 h-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder={t('productFilters.allBrands')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('productFilters.allBrands')}</SelectItem>
                  {brands.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* IMEI Scanner */}
            <div className="relative">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Scan or Enter IMEI..."
                className="pl-9 h-9 font-mono text-xs"
                value={imeiInput}
                onChange={(e) => setImeiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleImeiLookup()}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 content-start">
            {productsLoading ? (
              <div className="col-span-full flex items-center justify-center py-12 text-muted-foreground">
                {t('search.loading')}
              </div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full flex items-center justify-center py-12 text-muted-foreground">
                {search ? t('search.noResults') : t('search.noProducts')}
              </div>
            ) : (
              filtered.map((p: any) => {
              const stock = getStock(p)
              return (
                <button
                  key={p.id}
                  disabled={stock === 0}
                  onClick={() => addToCart(p)}
                  className="text-left rounded-lg border bg-card p-3 hover:shadow-md hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="relative mb-2">
                    <AuthImage
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-28 w-full rounded object-cover"
                      fallback={<div className="h-28 w-full rounded bg-muted flex items-center justify-center"><Package className="h-7 w-7 text-muted-foreground" /></div>}
                    />
                    <Badge
                      variant={stock === 0 ? 'destructive' : stock <= 5 ? 'warning' : 'secondary'}
                      className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5"
                    >
                      {stock === 0 ? t('product.out') : `${stock}`}
                    </Badge>
                  </div>
                  <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1.5">{p.name}</h3>
                  <div className="text-sm font-semibold text-primary">{formatCurrency(p.sellingPrice)}</div>
                </button>
              )
            }))}
          </div>
        </div>

        {/* Right — cart */}
        <div className="flex flex-col w-full lg:w-80 xl:w-96 border-t lg:border-t-0">
          <div className="p-3 md:p-4 border-b flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="font-medium text-sm">{t('cart.title')}</span>
            <Badge variant="secondary" className="ml-auto">{t('cart.items', { count: cart.length })}</Badge>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setHoldSalesOpen(true)}
              title="Hold/Resume Sales"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[50vh] lg:max-h-none">
            {cart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{t('cart.empty')}</div>
            ) : (
              <div className="divide-y">
                {cart.map(item => (
                    <div key={item.product.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.product.name}</div>
                          {item.imeiNumbers && item.imeiNumbers.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.imeiNumbers.map((imei, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] font-mono">
                                  <Smartphone className="h-2.5 w-2.5 mr-1" />
                                  {imei}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <Input
                            type="number" min="0" step="0.01"
                            value={item.price}
                            onChange={e => updatePrice(item.product.id, Number(e.target.value))}
                            className="h-7 text-xs mt-1 w-28"
                          />
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleEditItem(item)} title="Edit item">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFromCart(item.product.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product.id, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product.id, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + checkout */}
          <div className="border-t p-3 md:p-4 space-y-2">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>{t('totals.subtotal')}</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex items-center gap-2">
                <Select value={discountType} onValueChange={(v: 'PERCENTAGE' | 'FIXED_AMOUNT') => setDiscountType(v)}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">{t('totals.percentage')}</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">{t('totals.fixedAmount')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min="0" step="0.01" value={discount || ''} placeholder="0.00" onChange={e => setDiscount(Number(e.target.value))} className="h-7 flex-1 text-right text-sm" />
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('totals.discountAmount')}</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-1.5 border-t"><span>{t('totals.total')}</span><span>{formatCurrency(total)}</span></div>
            </div>
            <Button className="w-full" size="lg" disabled={cart.length === 0} onClick={() => setPaymentOpen(true)}>
              {t('checkout.charge', { amount: formatCurrency(total) })}
            </Button>
          </div>
        </div>
      </div>

      {/* Payment modal */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('payment.completePayment')}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="text-2xl font-bold text-center">{formatCurrency(total)}</div>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${paymentMethod === m.value ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}`}>
                  <m.icon className="h-4 w-4" />{m.label}
                </button>
              ))}
            </div>

            {/* Partial Payment Option - Only for registered customers */}
            {customerId && customerId !== 'walkin' && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <Label>{t('payment.partialPayment')}</Label>
                  <span className="text-xs text-muted-foreground">{t('payment.optional')}</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={total}
                  step="0.01"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  placeholder={t('payment.fullAmount', { amount: formatCurrency(total) })}
                  className="text-sm"
                />
                {amountPaid && Number(amountPaid) < total && (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t('payment.amountPaid')}</span>
                      <span className="font-medium text-foreground">{formatCurrency(Number(amountPaid))}</span>
                    </div>
                    <div className="flex justify-between text-red-600 font-semibold">
                      <span>{t('payment.amountDue')}</span>
                      <span>{formatCurrency(amountDue)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'CASH' && (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label>{t('payment.cashReceived')}</Label>
                  <Input type="number" min="0" step="0.01" value={cashReceived} onChange={e => setCashReceived(e.target.value)} autoFocus />
                </div>
                {Number(cashReceived) > 0 && <div className="flex justify-between text-sm font-medium"><span>{t('payment.change')}</span><span className="text-emerald-500">{formatCurrency(change)}</span></div>}
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={
                saleMutation.isPending ||
                (paymentMethod === 'CASH' && !amountPaid && Number(cashReceived) < total) ||
                (!!amountPaid && Number(amountPaid) <= 0)
              }
              onClick={handleCheckout}
            >
              {saleMutation.isPending ? t('payment.processing') :
               amountPaid && Number(amountPaid) < total ? t('payment.confirmPartialPayment') :
               t('payment.confirmSale')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptDialog sale={receiptSale} onClose={() => setReceiptSale(null)} />

      <CustomerSelectionModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={(customer) => {
          setSelectedCustomer(customer)
          setCustomerId(customer?.id || '')
        }}
        selectedCustomerId={customerId}
      />

      <EditCartItemModal
        item={editingItem}
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEditedItem}
      />

      <HoldSalesModal
        open={holdSalesOpen}
        onClose={() => setHoldSalesOpen(false)}
        heldSales={heldSales}
        onResume={handleResumeSale}
        onDelete={handleDeleteHeldSale}
        onHold={handleHoldSale}
        currentCart={cart}
      />

      <BarcodeScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => { setScannerOpen(false); handleBarcode(code) }}
      />

      <Dialog open={!!imeiDialogProduct} onOpenChange={(open) => { if (!open) { setImeiDialogProduct(null); setSelectedImeis([]) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {t('imeiDialog.title')}
            </DialogTitle>
          </DialogHeader>
          {imeiDialogProduct && (
            <div className="space-y-4 mt-2">
              <div className="text-sm text-muted-foreground">
                {imeiDialogProduct.name}
              </div>
              {availableImeis.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {t('imeiDialog.noAvailable')}
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                  {availableImeis.map((imei: any) => (
                    <label key={imei.id} className="flex items-center gap-3 p-3 hover:bg-accent/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedImeis.includes(imei.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedImeis(prev => [...prev, imei.id])
                          } else {
                            setSelectedImeis(prev => prev.filter(id => id !== imei.id))
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-mono">{imei.imei}</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setImeiDialogProduct(null); setSelectedImeis([]) }}>
                  {t('imeiDialog.cancel')}
                </Button>
                <Button onClick={handleImeiConfirm} disabled={selectedImeis.length === 0}>
                  {t('imeiDialog.confirm', { count: selectedImeis.length })}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
