'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Search, Eye, RotateCcw, Receipt, Printer, ChevronLeft, ChevronRight, Trash2, RefreshCw, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import api from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ReceiptDialog } from '@/components/receipt/receipt-dialog'
import type { ReceiptSale } from '@/components/receipt/receipt-content'
import { ExportDialog } from '@/components/export/export-dialog'
import type { ExportConfig } from '@/components/export/export-dialog'
import { generatePDF, printReport } from '@/lib/pdf-generator'

interface SaleItem { id: string; quantity: number; sellingPrice: number; discount: number; total: number; product: { name: string; sku: string }; imeiDevice?: { imei: string } | null }
interface Sale {
  id: string; invoiceNumber: string; total: number; subtotal: number; discount: number; tax: number
  amountPaid: number; amountDue: number; paymentStatus: string
  status: string; paymentMethod: string; createdAt: string
  customer?: { name: string; phone?: string }
  user: { name: string }
  items: SaleItem[]
}

const STATUS_VARIANTS: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  COMPLETED: 'success', REFUNDED: 'destructive', PARTIALLY_REFUNDED: 'warning', ON_HOLD: 'secondary',
}

const PAYMENT_STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'secondary'> = {
  PAID: 'default', PARTIALLY_PAID: 'secondary', UNPAID: 'destructive',
}

export default function SalesPage() {
  const t = useTranslations('sales')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [paymentStatus, setPaymentStatus] = useState<string>('ALL')
  const [status, setStatus] = useState<string>('ALL')
  const [filterCustomer, setFilterCustomer] = useState<string>('ALL')
  const [filterMethod, setFilterMethod] = useState<string>('ALL')
  const [filterCashier, setFilterCashier] = useState<string>('ALL')
  const [viewing, setViewing] = useState<Sale | null>(null)
  const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const PM_LABELS: Record<string, string> = {
    CASH: t('paymentMethods.CASH'),
    CARD: t('paymentMethods.CARD'),
    BANK_TRANSFER: t('paymentMethods.BANK_TRANSFER'),
    QR: t('paymentMethods.QR'),
  }

  const { data: salesData, isLoading } = useQuery<any>({
    queryKey: ['sales-all', page, limit, search, paymentStatus, status, filterCustomer, filterMethod, filterCashier],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(paymentStatus !== 'ALL' && { paymentStatus }),
        ...(status !== 'ALL' && { status }),
        ...(filterCustomer !== 'ALL' && { customerId: filterCustomer }),
        ...(filterMethod !== 'ALL' && { paymentMethod: filterMethod }),
        ...(filterCashier !== 'ALL' && { userId: filterCashier }),
      })
      return api.get(`/sales?${params}`).then(r => r.data)
    },
  })
  const sales = salesData?.data || []
  const meta = salesData?.meta || { total: 0, page: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }

  const { data: customersData } = useQuery<any>({
    queryKey: ['customers-all'],
    queryFn: () => api.get('/customers?limit=1000').then(r => r.data)
  })
  const customers = customersData?.data || []

  const { data: usersData } = useQuery<any>({
    queryKey: ['users-all'],
    queryFn: () => api.get('/users?limit=100').then(r => r.data)
  })
  const users = usersData || []

  // Auto-open sale detail if saleId in URL
  useEffect(() => {
    const saleId = searchParams.get('saleId')
    if (saleId && sales.length > 0 && !viewing) {
      const sale = sales.find((s: Sale) => s.id === saleId)
      if (sale) {
        setViewing(sale)
        // Remove the saleId from URL after opening
        router.replace('/sales', { scroll: false })
      }
    }
  }, [searchParams, sales, viewing, router])

  const refundMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/sales/${id}/refund`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sales-all'] }); toast.success(t('toast.refundSuccess')); setViewing(null) },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toast.refundFailed')),
  })

  const { data: deletedSalesData, isLoading: isLoadingDeleted } = useQuery<any>({
    queryKey: ['deleted-sales', page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      return api.get(`/sales/deleted/list?${params}`).then(r => r.data)
    },
    enabled: showDeleted,
  })
  const deletedSales = deletedSalesData?.data || []
  const deletedMeta = deletedSalesData?.meta || { total: 0, page: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/sales/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-sales'] })
      queryClient.invalidateQueries({ queryKey: ['sales-all'] })
      toast.success(t('toast.restoreSuccess'))
      setRestoreConfirm(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toast.restoreFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-all'] })
      queryClient.invalidateQueries({ queryKey: ['deleted-sales'] })
      toast.success(t('toast.deleteSuccess'))
      setDeleteConfirm(null)
      setViewing(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toast.deleteFailed')),
  })

  const exportColumns = [
    { key: 'invoiceNumber', label: t('table.invoice'), default: true },
    { key: 'customer', label: t('table.customer'), default: true },
    { key: 'date', label: t('table.date'), default: true },
    { key: 'paymentMethod', label: t('table.method'), default: true },
    { key: 'total', label: t('table.total'), default: true },
    { key: 'paymentStatus', label: t('table.payment'), default: true },
    { key: 'status', label: t('table.status'), default: true },
  ]

  const exportData = sales.map((sale: any) => ({
    invoiceNumber: sale.invoiceNumber,
    customer: sale.customer?.name ?? t('walkIn'),
    date: formatDateTime(sale.createdAt),
    paymentMethod: PM_LABELS[sale.paymentMethod] || sale.paymentMethod,
    total: sale.total,
    paymentStatus: t(`paymentStatuses.${sale.paymentStatus}` as any),
    status: t(`statuses.${sale.status}` as any),
  }))

  const activeFilters: Record<string, string> = {}
  if (paymentStatus !== 'ALL') activeFilters[t('filters.paymentStatus')] = t(`paymentStatuses.${paymentStatus}` as any)
  if (status !== 'ALL') activeFilters[t('filters.status')] = t(`statuses.${status}` as any)

  const handleExportPDF = async (config: ExportConfig) => {
    const columns = exportColumns
      .filter(col => config.columns.includes(col.key))
      .map(col => ({ key: col.key, label: col.label }))

    await generatePDF({
      title: t('title'),
      data: exportData,
      columns,
      filename: 'sales-report',
      filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
      language: config.language,
    })
  }

  const handlePrint = (config: ExportConfig) => {
    const columns = exportColumns
      .filter(col => config.columns.includes(col.key))
      .map(col => ({ key: col.key, label: col.label }))

    printReport({
      title: t('title'),
      data: exportData,
      columns,
      filename: 'sales-report',
      filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
      language: config.language,
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('title')} />
      <div className="flex-1 p-3 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{showDeleted ? t('deletedSales') : t('title')}</h1>
          <div className="flex items-center gap-2">
            {!showDeleted && (
              <Button variant="outline" onClick={() => setExportOpen(true)}>
                <FileDown className="h-4 w-4 mr-2" />
                {t('exportPDF')}
              </Button>
            )}
            <Button
              variant={showDeleted ? 'outline' : 'secondary'}
              onClick={() => { setShowDeleted(!showDeleted); setPage(1); }}
            >
              {showDeleted ? (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {t('backToSales')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('viewDeleted')}
                </>
              )}
            </Button>
          </div>
        </div>

        {!showDeleted && (
        <>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="text-sm text-muted-foreground">{t('records', { count: meta.total })}</div>
        </div>

<div className="rounded-lg border bg-card overflow-x-auto">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead className="h-12">{t('table.invoice')}</TableHead>
                 <TableHead className="whitespace-nowrap h-12">
                   <Select value={filterCustomer} onValueChange={(v) => { setFilterCustomer(v); setPage(1); }}>
                     <SelectTrigger className="h-9 w-[130px] text-sm border-transparent hover:border-border">
                       <SelectValue placeholder={t('table.customer')} />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="ALL">{tCommon('all')}</SelectItem>
                       {customers.map((c: any) => (
                         <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </TableHead>
                 <TableHead className="whitespace-nowrap h-12">
                   <Select value={filterCashier} onValueChange={(v) => { setFilterCashier(v); setPage(1); }}>
                     <SelectTrigger className="h-9 w-[120px] text-sm border-transparent hover:border-border">
                       <SelectValue placeholder={t('table.cashier')} />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="ALL">{tCommon('all')}</SelectItem>
                       {users.map((u: any) => (
                         <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </TableHead>
                 <TableHead className="whitespace-nowrap h-12">
                   <Select value={filterMethod} onValueChange={(v) => { setFilterMethod(v); setPage(1); }}>
                     <SelectTrigger className="h-9 w-[110px] text-sm border-transparent hover:border-border">
                       <SelectValue placeholder={t('table.method')} />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="ALL">{tCommon('all')}</SelectItem>
                       <SelectItem value="CASH">{PM_LABELS.CASH}</SelectItem>
                       <SelectItem value="CARD">{PM_LABELS.CARD}</SelectItem>
                       <SelectItem value="BANK_TRANSFER">{PM_LABELS.BANK_TRANSFER}</SelectItem>
                       <SelectItem value="QR">{PM_LABELS.QR}</SelectItem>
                     </SelectContent>
                   </Select>
                 </TableHead>
                 <TableHead className="h-12">{t('table.total')}</TableHead>
                 <TableHead className="whitespace-nowrap h-12">
                   <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v); setPage(1); }}>
                     <SelectTrigger className="h-9 w-[130px] text-sm border-transparent hover:border-border">
                       <SelectValue placeholder={t('table.payment')} />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="ALL">{tCommon('all')}</SelectItem>
                       <SelectItem value="PAID">{t('paymentStatuses.PAID')}</SelectItem>
                       <SelectItem value="PARTIALLY_PAID">{t('paymentStatuses.PARTIALLY_PAID')}</SelectItem>
                       <SelectItem value="UNPAID">{t('paymentStatuses.UNPAID')}</SelectItem>
                     </SelectContent>
                   </Select>
                 </TableHead>
                 <TableHead className="whitespace-nowrap h-12">
                   <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                     <SelectTrigger className="h-9 w-[110px] text-sm border-transparent hover:border-border">
                       <SelectValue placeholder={t('table.status')} />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="ALL">{tCommon('all')}</SelectItem>
                       <SelectItem value="COMPLETED">{t('statuses.COMPLETED')}</SelectItem>
                       <SelectItem value="PENDING">{t('statuses.PENDING')}</SelectItem>
                       <SelectItem value="REFUNDED">{t('statuses.REFUNDED')}</SelectItem>
                     </SelectContent>
                   </Select>
                 </TableHead>
                 <TableHead className="h-12">{t('table.date')}</TableHead>
                 <TableHead className="w-[60px] h-12" />
               </TableRow>
             </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground">{tCommon('loading')}</TableCell></TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-1"><Receipt className="h-5 w-5 opacity-40" /><span>{t('noSalesYet')}</span></div>
                  </TableCell>
                </TableRow>
              ) : sales.map((sale: any) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono text-xs font-medium">{sale.invoiceNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{sale.customer?.name ?? t('walkIn')}</TableCell>
                  <TableCell className="text-muted-foreground">{sale.user.name}</TableCell>
                  <TableCell><Badge variant="outline">{PM_LABELS[sale.paymentMethod]}</Badge></TableCell>
                  <TableCell className="font-medium">{formatCurrency(sale.total)}</TableCell>
                  <TableCell>
                    <Badge variant={PAYMENT_STATUS_VARIANTS[sale.paymentStatus] || 'default'}>
                      {t(`paymentStatuses.${sale.paymentStatus}` as any)}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant={STATUS_VARIANTS[sale.status]}>{t(`statuses.${sale.status}` as any)}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDateTime(sale.createdAt)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(sale)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('pagination.pageOf', { page: meta.page, totalPages: meta.totalPages, total: meta.total })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={!meta.hasPreviousPage || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {tCommon('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!meta.hasNextPage || isLoading}
              >
                {tCommon('next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
        </>
        )}

        {showDeleted && (
          <>
<div className="rounded-lg border bg-card overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>{t('deletedTable.invoice')}</TableHead>
                     <TableHead>{t('deletedTable.customer')}</TableHead>
                     <TableHead>{t('deletedTable.total')}</TableHead>
                     <TableHead>{t('deletedTable.deletedAt')}</TableHead>
                     <TableHead className="w-[100px]" />
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {isLoadingDeleted ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">{tCommon('loading')}</TableCell></TableRow>
                  ) : deletedSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-1">
                          <Trash2 className="h-5 w-5 opacity-40" />
                          <span>{t('noDeletedSales')}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : deletedSales.map((sale: any) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs font-medium">{sale.invoiceNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{sale.customer?.name ?? t('walkIn')}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(sale.total)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDateTime(sale.deletedAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRestoreConfirm(sale.id)}
                          disabled={restoreMutation.isPending}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          {t('restore')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {deletedMeta.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t('pagination.pageOf', { page: deletedMeta.page, totalPages: deletedMeta.totalPages, total: deletedMeta.total })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={!deletedMeta.hasPreviousPage || isLoadingDeleted}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {tCommon('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!deletedMeta.hasNextPage || isLoadingDeleted}
                  >
                    {tCommon('next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">{viewing?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">{t('detail.customer')}</span><span>{viewing.customer?.name ?? t('walkIn')}</span>
                <span className="text-muted-foreground">{t('detail.cashier')}</span><span>{viewing.user.name}</span>
                <span className="text-muted-foreground">{t('detail.payment')}</span><span>{PM_LABELS[viewing.paymentMethod]}</span>
                <span className="text-muted-foreground">{t('detail.date')}</span><span>{formatDateTime(viewing.createdAt)}</span>
                <span className="text-muted-foreground">{t('detail.status')}</span><span><Badge variant={STATUS_VARIANTS[viewing.status]}>{t(`statuses.${viewing.status}` as any)}</Badge></span>
                <span className="text-muted-foreground">{t('detail.paymentStatus')}</span><span><Badge variant={PAYMENT_STATUS_VARIANTS[viewing.paymentStatus] || 'default'}>{t(`paymentStatuses.${viewing.paymentStatus}` as any)}</Badge></span>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('detail.product')}</TableHead>
                      {viewing.items.some(item => item.imeiDevice?.imei) && (
                        <TableHead>IMEI</TableHead>
                      )}
                      <TableHead className="text-end">{t('detail.qty')}</TableHead>
                      <TableHead className="text-end">{t('detail.price')}</TableHead>
                      <TableHead className="text-end">{t('detail.total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewing.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.product.name}</TableCell>
                        {viewing.items.some(i => i.imeiDevice?.imei) && (
                          <TableCell className="text-xs text-muted-foreground">
                            {item.imeiDevice?.imei || '-'}
                          </TableCell>
                        )}
                        <TableCell className="text-end text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-end text-sm">{formatCurrency(item.sellingPrice)}</TableCell>
                        <TableCell className="text-end text-sm font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-1 text-sm border-t pt-3">
                <div className="flex justify-between text-muted-foreground"><span>{t('detail.subtotal')}</span><span>{formatCurrency(viewing.subtotal)}</span></div>
                {viewing.discount > 0 && <div className="flex justify-between text-muted-foreground"><span>{t('detail.discount')}</span><span>-{formatCurrency(viewing.discount)}</span></div>}
                {viewing.tax > 0 && <div className="flex justify-between text-muted-foreground"><span>{t('detail.tax')}</span><span>{formatCurrency(viewing.tax)}</span></div>}
                <div className="flex justify-between font-semibold text-base"><span>{t('detail.total')}</span><span>{formatCurrency(viewing.total)}</span></div>
                <div className="flex justify-between text-emerald-600"><span>{t('detail.amountPaid')}</span><span>{formatCurrency(viewing.amountPaid)}</span></div>
                {viewing.amountDue > 0 && (
                  <div className="flex justify-between text-destructive font-medium"><span>{t('detail.amountDue')}</span><span>{formatCurrency(viewing.amountDue)}</span></div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReceiptSale(viewing)}>
                  <Printer className="h-4 w-4 mr-2" />
                  {t('detail.receipt')}
                </Button>
                {viewing.status === 'COMPLETED' && (
                  <Button variant="destructive" className="flex-1" disabled={refundMutation.isPending} onClick={() => refundMutation.mutate(viewing.id)}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {refundMutation.isPending ? t('detail.processing') : t('detail.refund')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirm(viewing.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReceiptDialog sale={receiptSale} onClose={() => setReceiptSale(null)} />

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title={t('title')}
        columns={exportColumns}
        data={exportData}
        filename="sales-report"
        filters={Object.keys(activeFilters).length > 0 ? activeFilters : undefined}
        onExportPDF={handleExportPDF}
        onPrint={handlePrint}
      />

      <AlertDialog open={!!restoreConfirm} onOpenChange={() => setRestoreConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('restoreConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('restoreConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreConfirm && restoreMutation.mutate(restoreConfirm)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? t('restoring') : t('restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('deleting') : tCommon('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
