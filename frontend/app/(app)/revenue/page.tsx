'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { DollarSign, Download, Filter, FileText } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import api from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { exportTableToCSV, exportToPDF, formatCurrencyForExport, formatDateForExport } from '@/lib/export'

interface Sale {
  id: string
  invoiceNumber: string
  createdAt: string
  customer?: { name: string }
  total: number
  amountPaid: number
  amountDue: number
  paymentStatus: string
  paymentMethod: string
}

export default function RevenuePage() {
  const t = useTranslations('revenue')
  const [period, setPeriod] = useState('month')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const PERIODS = [
    { value: 'today', label: t('periods.today') },
    { value: 'week', label: t('periods.week') },
    { value: 'month', label: t('periods.month') },
    { value: 'custom', label: t('periods.custom') },
  ]

  const { dateFrom: finalDateFrom, dateTo: finalDateTo } = useMemo(() => {
    if (period === 'custom') {
      return { dateFrom, dateTo }
    }
    const now = new Date()
    const to = now.toISOString()
    let from = new Date()

    if (period === 'today') {
      from.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
      from.setDate(from.getDate() - 7)
    } else if (period === 'month') {
      from.setDate(from.getDate() - 30)
    }

    return { dateFrom: from.toISOString(), dateTo: to }
  }, [period, dateFrom, dateTo])

  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ['revenue-sales', finalDateFrom, finalDateTo],
    queryFn: async () => {
      const params: any = { limit: 100 }
      const { data } = await api.get('/sales', { params })

      // data is paginated, extract the actual array
      const salesArray = data.data || data

      // Filter by date range
      return salesArray.filter((sale: Sale) => {
        const saleDate = new Date(sale.createdAt)
        const from = new Date(finalDateFrom)
        const to = new Date(finalDateTo)
        return saleDate >= from && saleDate <= to
      })
    },
    enabled: !!finalDateFrom && !!finalDateTo,
  })

  const filteredSales = sales.filter(sale =>
    sale.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    (sale.customer?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + Number(sale.total), 0)
  const totalPaid = filteredSales.reduce((sum, sale) => sum + Number(sale.amountPaid), 0)
  const totalDue = filteredSales.reduce((sum, sale) => sum + Number(sale.amountDue), 0)

  const paymentStatusColor = (status: string) => {
    if (status === 'PAID') return 'bg-green-500/10 text-green-700 dark:text-green-400'
    if (status === 'PARTIALLY_PAID') return 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
    return 'bg-red-500/10 text-red-700 dark:text-red-400'
  }

  const handleExportCSV = () => {
    const exportData = filteredSales.map(sale => ({
      [t('export.columns.invoice')]: sale.invoiceNumber,
      [t('export.columns.date')]: formatDateForExport(sale.createdAt),
      [t('export.columns.customer')]: sale.customer?.name || t('walkIn'),
      [t('export.columns.paymentMethod')]: sale.paymentMethod,
      [t('export.columns.total')]: formatCurrencyForExport(sale.total),
      [t('export.columns.paid')]: formatCurrencyForExport(sale.amountPaid),
      [t('export.columns.due')]: formatCurrencyForExport(sale.amountDue),
      [t('export.columns.status')]: sale.paymentStatus,
    }))

    const columns = [
      { key: t('export.columns.invoice'), label: t('export.columns.invoice') },
      { key: t('export.columns.date'), label: t('export.columns.date') },
      { key: t('export.columns.customer'), label: t('export.columns.customer') },
      { key: t('export.columns.paymentMethod'), label: t('export.columns.paymentMethod') },
      { key: t('export.columns.total'), label: t('export.columns.total') },
      { key: t('export.columns.paid'), label: t('export.columns.paid') },
      { key: t('export.columns.due'), label: t('export.columns.due') },
      { key: t('export.columns.status'), label: t('export.columns.status') },
    ]

    exportTableToCSV(exportData, columns, `revenue-report-${new Date().toISOString().split('T')[0]}`)
  }

  const handleExportPDF = () => {
    const exportData = filteredSales.map(sale => ({
      [t('export.columns.invoice')]: sale.invoiceNumber,
      [t('export.columns.date')]: formatDateForExport(sale.createdAt),
      [t('export.columns.customer')]: sale.customer?.name || t('walkIn'),
      [t('export.columns.payment')]: sale.paymentMethod,
      [t('export.columns.total')]: formatCurrency(sale.total),
      [t('export.columns.paid')]: formatCurrency(sale.amountPaid),
      [t('export.columns.due')]: formatCurrency(sale.amountDue),
      [t('export.columns.status')]: sale.paymentStatus,
    }))

    const columns = [
      { key: t('export.columns.invoice'), label: t('export.columns.invoice') },
      { key: t('export.columns.date'), label: t('export.columns.date') },
      { key: t('export.columns.customer'), label: t('export.columns.customer') },
      { key: t('export.columns.payment'), label: t('export.columns.payment') },
      { key: t('export.columns.total'), label: t('export.columns.total') },
      { key: t('export.columns.paid'), label: t('export.columns.paid') },
      { key: t('export.columns.due'), label: t('export.columns.due') },
      { key: t('export.columns.status'), label: t('export.columns.status') },
    ]

    exportToPDF(t('export.reportTitle'), exportData, columns, 'revenue-report')
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('title')} />

      <div className="flex-1 p-3 md:p-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              <span>{t('summary.totalRevenue')}</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground mt-1">{t('summary.salesCount', { count: filteredSales.length })}</div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="text-muted-foreground text-sm mb-1">{t('summary.amountPaid')}</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
            <div className="text-xs text-muted-foreground mt-1">{t('summary.collected')}</div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="text-muted-foreground text-sm mb-1">{t('summary.amountDue')}</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDue)}</div>
            <div className="text-xs text-muted-foreground mt-1">{t('summary.outstanding')}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" />
            <span className="font-medium">{t('filters.title')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">{t('filters.period')}</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {period === 'custom' && (
              <>
                <div>
                  <Label className="text-xs">{t('filters.fromDate')}</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{t('filters.toDate')}</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </>
            )}

            <div>
              <Label className="text-xs">{t('filters.search')}</Label>
              <Input
                placeholder={t('filters.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-medium">{t('table.salesList')}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {t('table.export')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t('table.exportCsv')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t('table.exportPdf')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.invoice')}</TableHead>
                  <TableHead>{t('table.date')}</TableHead>
                  <TableHead>{t('table.customer')}</TableHead>
                  <TableHead>{t('table.payment')}</TableHead>
                  <TableHead className="text-end">{t('table.total')}</TableHead>
                  <TableHead className="text-end">{t('table.paid')}</TableHead>
                  <TableHead className="text-end">{t('table.due')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('table.loading')}
                    </TableCell>
                  </TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('table.noSalesFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map(sale => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">{sale.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(sale.createdAt)}</TableCell>
                      <TableCell className="text-sm">
                        {sale.customer?.name || <span className="text-muted-foreground">{t('walkIn')}</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{sale.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-end font-semibold">{formatCurrency(sale.total)}</TableCell>
                      <TableCell className="text-end text-green-600">{formatCurrency(sale.amountPaid)}</TableCell>
                      <TableCell className="text-end text-red-600">
                        {Number(sale.amountDue) > 0 ? formatCurrency(sale.amountDue) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${paymentStatusColor(sale.paymentStatus)}`}>
                          {sale.paymentStatus === 'PAID' ? t('paymentStatus.PAID') :
                           sale.paymentStatus === 'PARTIALLY_PAID' ? t('paymentStatus.PARTIAL') : t('paymentStatus.UNPAID')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
