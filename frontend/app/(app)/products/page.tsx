'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Plus, Search, Pencil, Trash2, Package, Tag, Layers, ScanBarcode, ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { BarcodeScannerDialog } from '@/components/barcode/barcode-scanner-dialog'
import { AuthImage } from '@/components/ui/auth-image'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface Category { id: string; name: string }
interface Brand { id: string; name: string }
interface Supplier { id: string; companyName: string }
interface InventoryEntry { quantity: number; minStock: number }
interface Product {
  id: string
  name: string
  sku?: string
  barcode?: string
  description?: string
  imageUrl?: string
  costPrice: number
  sellingPrice: number
  isActive: boolean
  trackImei?: boolean
  supplierId?: string
  category: Category
  brand?: Brand
  inventory?: InventoryEntry | null
  createdAt: string
  _count?: {
    imeiDevices: number
  }
}

const defaultForm = {
  name: '', sku: '', barcode: '', description: '', categoryId: '', brandId: '', supplierId: '',
  costPrice: '', sellingPrice: '', imageUrl: '', quantity: '', isActive: true, trackImei: false,
}
// Picked-but-not-yet-uploaded image file — images are stored server-side keyed
// by productId, so a new product's image can only be uploaded after creation
// returns an id. previewUrl is a local object URL used only for instant preview.
type PendingImage = { file: File; previewUrl: string } | null

type Tab = 'products' | 'categories' | 'brands'

export default function ProductsPage() {
  const t = useTranslations('products')
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('products')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterBrand, setFilterBrand] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterImei, setFilterImei] = useState('all')
  const [sortKey, setSortKey] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [pendingImage, setPendingImage] = useState<PendingImage>(null)
  const [catName, setCatName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [formScannerOpen, setFormScannerOpen] = useState(false)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState('')
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null)
  const [stockQuantity, setStockQuantity] = useState('')
  const [stockCostPrice, setStockCostPrice] = useState('')
  const [hwScanInput, setHwScanInput] = useState('')
const [imeiInput, setImeiInput] = useState('')
const [imeiProductId, setImeiProductId] = useState<string | null>(null)
const [imeiSearch, setImeiSearch] = useState('')
const { data: imeiSearchResults = [], isLoading: imeiSearchLoading } = useQuery<any[]>({
    queryKey: ['imei-search', imeiSearch],
    queryFn: () => api.get(`/imei/search?q=${imeiSearch}`).then(r => r.data),
    enabled: imeiSearch.length >= 3,
})

  const { data: productsData, isLoading } = useQuery<any>({
    queryKey: ['products-all'],
    queryFn: () => api.get('/products?limit=100').then((r) => {
      console.log('Products API response:', r.data)
      return r.data
    }),
  })
  const products = productsData?.data || []
  console.log('productsData:', productsData)
  console.log('products array:', products)

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then((r) => r.data),
  })
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => api.get('/products/brands').then((r) => r.data),
  })
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers?limit=100').then((r) => r.data.data || r.data),
  })

  // Uploads the pending image (if any) for a just-created/just-updated product.
  // The image endpoint is keyed by productId, so this always runs after the
  // product itself exists.
  async function uploadPendingImageIfAny(productId: string) {
    if (!pendingImage) return
    const fd = new FormData()
    fd.append('file', pendingImage.file)
    await api.post(`/products/${productId}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/products', data),
    onSuccess: async (res, variables: any) => {
      await uploadPendingImageIfAny(res.data.id)
      queryClient.invalidateQueries({ queryKey: ['products-all'] })
      toast.success(t('toasts.productCreated'))
      if (variables.trackImei) {
        setImeiProductId(res.data.id)
      } else {
        closeDialog()
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toasts.failed')),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/products/${id}`, data),
    onSuccess: async (res) => {
      await uploadPendingImageIfAny(res.data.id)
      queryClient.invalidateQueries({ queryKey: ['products-all'] }); toast.success(t('toasts.productUpdated')); closeDialog()
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toasts.failed')),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products-all'] }); toast.success(t('toasts.productDeactivated')) },
    onError: () => toast.error(t('toasts.failedDeactivate')),
  })
  const createCatMutation = useMutation({
    mutationFn: (name: string) => api.post('/products/categories', { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); toast.success(t('toasts.categoryCreated')); setCatName('') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toasts.failed')),
  })
  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: () => toast.error(t('toasts.cannotDeleteCategory')),
  })
  const createBrandMutation = useMutation({
    mutationFn: (name: string) => api.post('/products/brands', { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['brands'] }); toast.success(t('toasts.brandCreated')); setBrandName('') },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toasts.failed')),
  })
  const deleteBrandMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/brands/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }),
    onError: () => toast.error(t('toasts.cannotDeleteBrand')),
  })
  const incrementStockMutation = useMutation({
    mutationFn: (data: { productId: string; quantity: number; costPrice?: number }) => api.post('/inventory/increment', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-all'] })
      toast.success(t('toasts.stockUpdated'))
      closeStockDialog()
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toasts.failedUpdateStock')),
  })

  // IMEI queries
  const { data: imeis = [], isLoading: imeisLoading } = useQuery<any[]>({
    queryKey: ['imeis', imeiProductId],
    queryFn: async () => {
      console.log('Fetching IMEIs for product:', imeiProductId)
      const response = await api.get(`/imei/product/${imeiProductId}`)
      console.log('IMEIs response:', response.data)
      return response.data
    },
    enabled: !!imeiProductId,
  })
  const addImeiMutation = useMutation({
    mutationFn: ({ productId, imeis }: { productId: string; imeis: string[] }) => api.post(`/imei/product/${productId}`, { imeis }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['imeis', imeiProductId] })
      queryClient.invalidateQueries({ queryKey: ['products-all'] })

      // Check if there were any errors
      if (response.data.errors && response.data.errors.length > 0) {
        // Show errors
        response.data.errors.forEach((error: string) => {
          toast.error(error)
        })
        // Also show success if some were created
        if (response.data.created && response.data.created.length > 0) {
          toast.success(t('toasts.imeiAdded', { count: response.data.created.length }))
        }
      } else {
        // All succeeded
        toast.success(t('toasts.imeiAdded'))
      }

      setImeiInput('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toasts.imeiAddFailed')),
  })
  const deleteImeiMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/imei/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imeis', imeiProductId] })
      queryClient.invalidateQueries({ queryKey: ['products-all'] })
      toast.success(t('toasts.imeiRemoved'))
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toasts.imeiDeleteFailed')),
  })

  function pickImage(file: File) {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setImeiSearch('')
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const imeiProductIds = imeiSearchResults.map((d: any) => d.productId)
  const filtered = products.filter((p: any) => {
    if (imeiSearchResults.length > 0 && !imeiProductIds.includes(p.id)) return false
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory === 'all' || p.category.id === filterCategory
    const matchBrand = filterBrand === 'all' || (p.brand?.id ?? 'none') === filterBrand
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? p.isActive : !p.isActive)
    const matchImei = filterImei === 'all' || (filterImei === 'imei' ? p.trackImei : !p.trackImei)
    return matchSearch && matchCat && matchBrand && matchStatus && matchImei
  })

  if (sortKey) {
    filtered.sort((a: any, b: any) => {
      let av: any, bv: any
      if (sortKey === 'stock') { av = a.inventory?.quantity ?? 0; bv = b.inventory?.quantity ?? 0 }
      else { av = a[sortKey]; bv = b[sortKey] }
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase() }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }

  function openCreate() { setEditing(null); setForm(defaultForm); setPendingImage(null); setDialogOpen(true); setImeiProductId(null); setImeiInput('') }
  function openEdit(p: Product) {
    setEditing(p)
    setForm({ name: p.name, sku: p.sku ?? '', barcode: p.barcode ?? '', description: p.description ?? '', categoryId: p.category.id, brandId: p.brand?.id ?? '', supplierId: p.supplierId ?? '', costPrice: String(p.costPrice), sellingPrice: String(p.sellingPrice), imageUrl: p.imageUrl ?? '', quantity: '', isActive: p.isActive, trackImei: p.trackImei ?? false })
    setPendingImage(null)
    setDialogOpen(true)
    setImeiProductId(p.trackImei ? p.id : null)
    setImeiInput('')
  }
  function closeDialog() {
    setDialogOpen(false); setEditing(null); setForm(defaultForm)
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage(null)
    setImeiProductId(null)
    setImeiInput('')
  }

  async function handleScannedBarcode(code: string) {
    const trimmed = code.trim()
    if (!trimmed) return
    const local = products.find((p: any) => p.barcode === trimmed || p.sku === trimmed)
    if (local) {
      setScannedProduct(local)
      setScannedBarcode(trimmed)
      setStockQuantity('')
      setStockCostPrice(String(local.costPrice))
      setStockDialogOpen(true)
      return
    }
    try {
      const { data } = await api.get<Product | null>(`/products/barcode/${encodeURIComponent(trimmed)}`)
      if (data) {
        setScannedProduct(data)
        setScannedBarcode(trimmed)
        setStockQuantity('')
        setStockCostPrice(String(data.costPrice))
        setStockDialogOpen(true)
      } else {
        toast.info(t('toasts.barcodeNotLinked', { barcode: trimmed }))
        openCreate()
        setForm((prev) => ({ ...prev, barcode: trimmed }))
      }
    } catch {
      toast.info(t('toasts.barcodeNotLinked', { barcode: trimmed }))
      openCreate()
      setForm((prev) => ({ ...prev, barcode: trimmed }))
    }
  }

  async function handleFormBarcodeScanned(code: string) {
    const trimmed = code.trim()
    if (!trimmed) return
    const local = products.find((p: any) => p.barcode === trimmed || p.sku === trimmed)
    if (local) {
      closeDialog()
      setScannedProduct(local)
      setScannedBarcode(trimmed)
      setStockQuantity('')
      setStockCostPrice(String(local.costPrice))
      setStockDialogOpen(true)
      toast.info(t('toasts.productExistsAddStock', { name: local.name }))
      return
    }
    try {
      const { data } = await api.get<Product | null>(`/products/barcode/${encodeURIComponent(trimmed)}`)
      if (data) {
        closeDialog()
        setScannedProduct(data)
        setScannedBarcode(trimmed)
        setStockQuantity('')
        setStockCostPrice(String(data.costPrice))
        setStockDialogOpen(true)
        toast.info(t('toasts.productExistsAddStock', { name: data.name }))
        return
      }
    } catch {
      // no existing product for this barcode — fall through to filling the form
    }
    f('barcode', trimmed)
  }

  function closeStockDialog() {
    setStockDialogOpen(false)
    setScannedProduct(null)
    setScannedBarcode('')
    setStockQuantity('')
    setStockCostPrice('')
  }

  function handleAddStock(e: React.FormEvent) {
    e.preventDefault()
    if (!scannedProduct || !stockQuantity) return
    const costPrice = stockCostPrice === '' ? undefined : Number(stockCostPrice)
    incrementStockMutation.mutate({
      productId: scannedProduct.id,
      quantity: Number(stockQuantity),
      ...(costPrice !== undefined && costPrice !== scannedProduct.costPrice ? { costPrice } : {}),
    })
  }

  function handleHwScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && hwScanInput.trim()) {
      e.preventDefault()
      handleScannedBarcode(hwScanInput)
      setHwScanInput('')
    }
  }

  function handleFormBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && form.barcode.trim()) {
      e.preventDefault()
      handleFormBarcodeScanned(form.barcode)
    }
  }

  function handleTrackImeiToggle(checked: boolean) {
    f('trackImei', checked)
    if (checked && editing) {
      setImeiProductId(editing.id)
    } else if (!checked) {
      setImeiProductId(null)
      setImeiInput('')
    }
  }

  function handleAddImei() {
    const trimmed = imeiInput.trim()
    if (!trimmed) return
    if (!/^\d{15}$/.test(trimmed)) {
      toast.error(t('toasts.imeiInvalid'))
      return
    }
    if (imeiProductId) {
      addImeiMutation.mutate({ productId: imeiProductId, imeis: [trimmed] })
    }
  }

  function handleAddImeiKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddImei()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.categoryId) { toast.error(t('toasts.categoryRequired')); return }
    if (!form.supplierId) { toast.error(t('toasts.supplierRequired')); return }
    const { quantity, imageUrl, ...rest } = form
    const payload: any = { ...rest, costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice), brandId: form.brandId || undefined, supplierId: form.supplierId, barcode: form.barcode || undefined, trackImei: form.trackImei }
    if (editing) { updateMutation.mutate({ id: editing.id, data: payload }) }
    else { createMutation.mutate({ ...payload, quantity: quantity === '' ? undefined : Number(quantity), trackImei: form.trackImei }) }
  }

  const f = (k: keyof typeof form, v: any) => setForm((prev) => ({ ...prev, [k]: v }))
  const isPending = createMutation.isPending || updateMutation.isPending

  const totalStock = (p: Product) => {
    // For products that track IMEI, use the count of available IMEI devices
    if (p.trackImei && p._count?.imeiDevices !== undefined) {
      return p._count.imeiDevices
    }
    // Otherwise use inventory quantity
    return p.inventory?.quantity ?? 0
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('title')} />
      <div className="flex-1 p-3 md:p-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide">
          {(['products', 'categories', 'brands'] as Tab[]).map((tabKey) => (
            <button key={tabKey} onClick={() => setTab(tabKey)} className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px whitespace-nowrap ${tab === tabKey ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t(`tabs.${tabKey}`)}
            </button>
          ))}
        </div>

        {/* Products tab */}
        {tab === 'products' && (
          <>
            <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
              <div className="flex items-center gap-2 flex-1 w-full flex-wrap">
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t('list.searchPlaceholder')} className="pl-9" value={search} onChange={handleSearchChange} />
                </div>
                <div className="relative max-w-xs w-full">
                  <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search by IMEI..."
                      className="pl-9 font-mono text-xs"
                      value={imeiSearch}
                      onChange={(e) => setImeiSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:flex-initial sm:w-56">
                  <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('list.scanBarcodePlaceholder')}
                    className="pl-9"
                    value={hwScanInput}
                    onChange={(e) => setHwScanInput(e.target.value)}
                    onKeyDown={handleHwScanKeyDown}
                  />
                </div>
                <Button onClick={openCreate} className="whitespace-nowrap"><Plus className="h-4 w-4 mr-2" />{t('list.addProduct')}</Button>
              </div>
            </div>

            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[48px]" />
                    <TableHead className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center gap-1 hover:text-foreground">
                          {t('list.table.product')}
                          {sortKey === 'name' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterImei(prev => prev === 'all' ? 'imei' : 'all')}
                          title={t('imeiBadge')}
                          className={`inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium transition-colors ${filterImei === 'imei' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                        >
                          {t('imeiBadge')}
                        </button>
                      </div>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">{t('list.table.sku')}</TableHead>
                    <TableHead className="whitespace-nowrap">
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="h-7 w-[130px] text-xs border-transparent hover:border-border">
                          <SelectValue placeholder={t('list.table.category')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('list.allCategories')}</SelectItem>
                          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      <Select value={filterBrand} onValueChange={setFilterBrand}>
                        <SelectTrigger className="h-7 w-[110px] text-xs border-transparent hover:border-border">
                          <div className="inline-flex items-center gap-1"><Filter className="h-3 w-3" /><span>{t('list.table.brand')}</span></div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('list.allCategories')}</SelectItem>
                          {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          <SelectItem value="none">{t('dialog.none')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      <button type="button" onClick={() => handleSort('costPrice')} className="inline-flex items-center gap-1 hover:text-foreground">
                        {t('list.table.cost')}
                        {sortKey === 'costPrice' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      <button type="button" onClick={() => handleSort('sellingPrice')} className="inline-flex items-center gap-1 hover:text-foreground">
                        {t('list.table.price')}
                        {sortKey === 'sellingPrice' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      <button type="button" onClick={() => handleSort('stock')} className="inline-flex items-center gap-1 hover:text-foreground">
                        {t('list.table.stock')}
                        {sortKey === 'stock' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-7 w-[110px] text-xs border-transparent hover:border-border">
                          <div className="inline-flex items-center gap-1"><Filter className="h-3 w-3" /><span>{t('list.table.status')}</span></div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('list.allCategories')}</SelectItem>
                          <SelectItem value="active">{t('list.active')}</SelectItem>
                          <SelectItem value="inactive">{t('list.inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={10} className="h-32 text-center text-muted-foreground">{t('list.loading')}</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-1"><Package className="h-5 w-5 opacity-40" /><span>{t('list.noProducts')}</span></div>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <AuthImage
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-9 w-9 rounded object-cover border"
                          fallback={<div className="h-9 w-9 rounded border bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {p.name}
                          {p.trackImei && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">IMEI</Badge>}
                          {imeiSearchResults.length > 0 && imeiProductIds.includes(p.id) && <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-emerald-600">Match</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{p.sku}</TableCell>
                      <TableCell><Badge variant="outline">{p.category.name}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{p.brand?.name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{formatCurrency(p.costPrice)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.sellingPrice)}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${totalStock(p) === 0 ? 'text-destructive' : totalStock(p) <= 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {totalStock(p)}
                        </span>
                      </TableCell>
                      <TableCell><Badge variant={p.isActive ? 'success' : 'secondary'}>{p.isActive ? t('list.active') : t('list.inactive')}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Categories tab */}
        {tab === 'categories' && (
          <div className="space-y-4 max-w-lg">
            <form onSubmit={(e) => { e.preventDefault(); createCatMutation.mutate(catName) }} className="flex gap-2">
              <Input placeholder={t('categories.namePlaceholder')} value={catName} onChange={(e) => setCatName(e.target.value)} required />
              <Button type="submit" disabled={createCatMutation.isPending}><Plus className="h-4 w-4 mr-1" />{t('categories.add')}</Button>
            </form>
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>{t('categories.name')}</TableHead><TableHead className="w-[60px]" /></TableRow></TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="h-20 text-center text-muted-foreground">{t('categories.noCategories')}</TableCell></TableRow>
                  ) : categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCatMutation.mutate(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Brands tab */}
        {tab === 'brands' && (
          <div className="space-y-4 max-w-lg">
            <form onSubmit={(e) => { e.preventDefault(); createBrandMutation.mutate(brandName) }} className="flex gap-2">
              <Input placeholder={t('brands.namePlaceholder')} value={brandName} onChange={(e) => setBrandName(e.target.value)} required />
              <Button type="submit" disabled={createBrandMutation.isPending}><Plus className="h-4 w-4 mr-1" />{t('brands.add')}</Button>
            </form>
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>{t('brands.name')}</TableHead><TableHead className="w-[60px]" /></TableRow></TableHeader>
                <TableBody>
                  {brands.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="h-20 text-center text-muted-foreground">{t('brands.noBrands')}</TableCell></TableRow>
                  ) : brands.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteBrandMutation.mutate(b.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? t('dialog.editProduct') : t('dialog.addProduct')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>{t('dialog.productImage')}</Label>
                <div className="flex items-center gap-3">
                  {pendingImage ? (
                    <img src={pendingImage.previewUrl} alt="preview" className="h-16 w-16 rounded object-cover border" />
                  ) : (
                    <AuthImage
                      src={form.imageUrl}
                      alt="preview"
                      className="h-16 w-16 rounded object-cover border"
                      fallback={<div className="h-16 w-16 rounded border bg-muted flex items-center justify-center"><Package className="h-6 w-6 text-muted-foreground" /></div>}
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) pickImage(file) }}
                    />
                  </div>
                </div>
              </div>
              <div className="col-span-2 space-y-1.5"><Label>{t('dialog.name')}</Label><Input value={form.name} onChange={(e) => f('name', e.target.value)} required /></div>
              <div className="space-y-1.5"><Label>{t('dialog.sku')}</Label><Input value={form.sku} onChange={(e) => f('sku', e.target.value)} placeholder={t('dialog.skuPlaceholder') || 'Auto-generated if empty'} /></div>
              <div className="space-y-1.5">
                <Label>{t('dialog.barcode')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.barcode}
                    onChange={(e) => f('barcode', e.target.value)}
                    onKeyDown={handleFormBarcodeKeyDown}
                    placeholder={t('dialog.barcodePlaceholder')}
                  />
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setFormScannerOpen(true)} title={t('dialog.scanWithCameraTitle')}>
                    <ScanBarcode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('dialog.category')}</Label>
                <Select value={form.categoryId} onValueChange={(v) => f('categoryId', v)}>
                  <SelectTrigger><SelectValue placeholder={t('dialog.selectPlaceholder')} /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('dialog.brand')}</Label>
                <Select value={form.brandId} onValueChange={(v) => f('brandId', v)}>
                  <SelectTrigger><SelectValue placeholder={t('dialog.none')} /></SelectTrigger>
                  <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('dialog.supplier')} *</Label>
                <Select value={form.supplierId} onValueChange={(v) => f('supplierId', v)}>
                  <SelectTrigger><SelectValue placeholder={t('dialog.none')} /></SelectTrigger>
                  <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.companyName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{t('dialog.costPrice')}</Label><Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => f('costPrice', e.target.value)} required /></div>
              <div className="space-y-1.5"><Label>{t('dialog.sellingPrice')}</Label><Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => f('sellingPrice', e.target.value)} required /></div>
              {!editing && !form.trackImei && (
                <div className="space-y-1.5">
                  <Label>{t('dialog.initialStock')}</Label>
                  <Input type="number" min="0" step="1" placeholder="0" value={form.quantity} onChange={(e) => f('quantity', e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t('dialog.initialStockHelp')}</p>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('dialog.trackImeiLabel')}</Label>
                  <p className="text-xs text-muted-foreground">{t('dialog.trackImeiHelp')}</p>
                </div>
                <Switch checked={form.trackImei} onCheckedChange={handleTrackImeiToggle} />
              </div>
              {form.trackImei && (
                <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                {imeiProductId ? (
                  <>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('dialog.imeiPlaceholder')}
                      value={imeiInput}
                      onChange={(e) => setImeiInput(e.target.value)}
                      onKeyDown={handleAddImeiKeyDown}
                      maxLength={15}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddImei}
                      disabled={addImeiMutation.isPending || !imeiInput.trim()}
                    >
                      {t('dialog.addImei')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('dialog.stockManagedByImei')}</p>
                  {imeisLoading ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Loading IMEIs...</p>
                  ) : imeis.length > 0 ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {imeis.map((imei: any) => (
                        <div key={imei.id} className="flex items-center justify-between rounded border bg-background px-3 py-1.5 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{imei.imei}</span>
                            <Badge variant={imei.status === 'AVAILABLE' ? 'success' : imei.status === 'SOLD' ? 'secondary' : 'outline'} className="text-[10px]">
                              {imei.status}
                            </Badge>
                          </div>
                          {imei.status === 'AVAILABLE' && (
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteImeiMutation.mutate(imei.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">{t('dialog.noImeisRegistered')}</p>
                  )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('dialog.saveProductFirstImei')}</p>
                )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeDialog}>{t('dialog.cancel')}</Button>
              <Button type="submit" disabled={isPending}>{isPending ? t('dialog.saving') : t('dialog.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BarcodeScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => { setScannerOpen(false); handleScannedBarcode(code) }}
      />

      <BarcodeScannerDialog
        open={formScannerOpen}
        onClose={() => setFormScannerOpen(false)}
        onDetected={(code) => { setFormScannerOpen(false); handleFormBarcodeScanned(code) }}
      />

      {/* Add stock dialog (after scanning a known product) */}
      <Dialog open={stockDialogOpen} onOpenChange={(open) => !open && closeStockDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('stockDialog.title')}</DialogTitle></DialogHeader>
          {scannedProduct && (
            <form onSubmit={handleAddStock} className="space-y-3 mt-2">
              <div className="rounded-lg border p-3 space-y-1">
                <div className="font-medium text-sm">{scannedProduct.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{t('stockDialog.barcodeLabel', { barcode: scannedBarcode })}</div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('stockDialog.quantityToAdd')}</Label>
                <Input type="number" min="1" step="1" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>{t('stockDialog.costPrice')}</Label>
                <Input type="number" min="0" step="0.01" value={stockCostPrice} onChange={(e) => setStockCostPrice(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t('stockDialog.costPriceHint')}</p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={closeStockDialog}>{t('stockDialog.cancel')}</Button>
                <Button type="submit" disabled={!stockQuantity || incrementStockMutation.isPending}>
                  {incrementStockMutation.isPending ? t('stockDialog.adding') : t('stockDialog.addStock')}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
