'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { TrendingUp, ShoppingCart, Receipt, Package, DollarSign, AlertCircle, Download, FileText } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { exportTableToCSV, formatCurrencyForExport, formatDateForExport } from '@/lib/export'
import { generatePDF, printReport, type PDFConfig } from '@/lib/pdf-generator'
import { ExportDialog, type ExportConfig } from '@/components/export/export-dialog'
import ChequeReports from '@/components/reports/cheque-reports'

type Tab =
  | 'overview'
  | 'profit'
  | 'loans'
  | 'purchases'
  | 'cashflow'
  | 'receivables'
  | 'payables'
  | 'cheques'

const PIE_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316','#64748b']

const today = new Date()
const currentYear = today.getFullYear()
const month = String(today.getMonth() + 1).padStart(2, '0')
const day = String(today.getDate()).padStart(2, '0')
const firstOfMonth = `${currentYear}-${month}-01`
const todayStr = `${currentYear}-${month}-${day}`

const generateYearOptions = () => {
  const years = []
  const startYear = 2023
  for (let y = startYear; y <= currentYear + 1; y++) {
    years.push(y)
  }
  return years
}

export default function ReportsPage() {
  const router = useRouter()
  const t = useTranslations('reports')
  const tc = useTranslations()
  const [tab, setTab] = useState<Tab>('overview')
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(todayStr)
  const [year, setYear] = useState(String(currentYear))
  const yearOptions = generateYearOptions()

  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportConfig, setExportConfig] = useState<{
    title: string
    columns: { key: string; label: string; default?: boolean }[]
    data: any[]
    filename: string
    filters: Record<string, string>
  } | null>(null)

  const params = (extra?: Record<string, string>) => {
    const endDate = new Date(dateTo)
    endDate.setDate(endDate.getDate() + 1)
    const adjustedDateTo = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

    const p: Record<string, string> = { dateFrom, dateTo: adjustedDateTo }
    return { ...p, ...extra }
  }

  const { data: sales } = useQuery({
    queryKey: ['report-sales', dateFrom, dateTo],
    queryFn: () => api.get('/reports/sales', { params: params() }).then(r => r.data),
    enabled: !!dateFrom && !!dateTo,
  })

  const { data: expenses } = useQuery({
    queryKey: ['report-expenses', dateFrom, dateTo],
    queryFn: () => api.get('/reports/expenses', { params: params() }).then(r => r.data),
    enabled: !!dateFrom && !!dateTo,
  })

  const { data: topProducts = [] } = useQuery<any[]>({
    queryKey: ['report-top-products', dateFrom, dateTo],
    queryFn: () => api.get('/reports/top-products', { params: params({ limit: '8' }) }).then(r => r.data),
    enabled: !!dateFrom && !!dateTo,
  })

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ['report-payment-methods', dateFrom, dateTo],
    queryFn: () => api.get('/reports/payment-methods', { params: params() }).then(r => r.data),
    enabled: !!dateFrom && !!dateTo,
  })

  const { data: monthly = [] } = useQuery<any[]>({
    queryKey: ['report-monthly', year],
    queryFn: () => api.get('/reports/revenue-vs-expenses', { params: { year } }).then(r => r.data),
  })

  const { data: profitData = [] } = useQuery<any[]>({
    queryKey: ['report-profit', dateFrom, dateTo],
    queryFn: () => api.get('/reports/profit', { params: params() }).then(r => r.data),
    enabled: !!dateFrom && !!dateTo && tab === 'profit',
  })

  const { data: receivables = [] } = useQuery<any[]>({
    queryKey: ['report-receivables'],
    queryFn: () => api.get('/reports/outstanding-receivables').then(r => r.data),
    enabled: tab === 'receivables',
  })

  const { data: payables = [] } = useQuery<any[]>({
    queryKey: ['report-payables'],
    queryFn: () => api.get('/reports/outstanding-payables').then(r => r.data),
    enabled: tab === 'payables',
  })

  const { data: loansReport = [] } = useQuery<any[]>({
    queryKey: ['report-loans', dateFrom, dateTo],
    queryFn: () => api.get('/reports/loans', { params: { dateFrom, dateTo } }).then(r => r.data),
    enabled: !!dateFrom && !!dateTo && tab === 'loans',
  })

  const { data: purchasesReport = [] } = useQuery<any[]>({
    queryKey: ['report-purchases', dateFrom, dateTo],
    queryFn: () => api.get('/reports/purchases', { params: params() }).then(r => r.data),
    enabled: !!dateFrom && !!dateTo && tab === 'purchases',
  })

  const { data: cashflowData } = useQuery({
    queryKey: ['report-cashflow', dateFrom, dateTo],
    queryFn: () => api.get('/reports/cashflow', { params: params() }).then(r => r.data),
    enabled: !!dateFrom && !!dateTo && tab === 'cashflow',
  })

  const profit = (sales?.totalRevenue ?? 0) - (expenses?.totalExpenses ?? 0)

  const activeFilters = {
    'From': dateFrom,
    'To': dateTo,
  }

  const openExportDialog = (config: {
    title: string
    columns: { key: string; label: string; default?: boolean }[]
    data: any[]
    filename: string
    filters: Record<string, string>
  }) => {
    setExportConfig(config)
    setExportDialogOpen(true)
  }

  const handleExportPDF = (config: ExportConfig) => {
    if (!exportConfig) return
    const selectedCols = exportConfig.columns.filter(c => config.columns.includes(c.key))
    const pdfConfig: PDFConfig = {
      title: exportConfig.title,
      data: exportConfig.data,
      columns: selectedCols,
      filename: exportConfig.filename,
      filters: exportConfig.filters,
      language: config.language,
    }
    generatePDF(pdfConfig)
  }

  const handlePrint = (config: ExportConfig) => {
    if (!exportConfig) return
    const selectedCols = exportConfig.columns.filter(c => config.columns.includes(c.key))
    const pdfConfig: PDFConfig = {
      title: exportConfig.title,
      data: exportConfig.data,
      columns: selectedCols,
      filename: exportConfig.filename,
      filters: exportConfig.filters,
      language: config.language,
    }
    printReport(pdfConfig)
  }

  const handleExportProfitCSV = () => {
    const exportData = profitData.map((item: any) => ({
      Product: item.productName,
      'Quantity Sold': item.quantitySold,
      Revenue: formatCurrencyForExport(item.revenue),
      Cost: formatCurrencyForExport(item.cost),
      Profit: formatCurrencyForExport(item.profit),
      'Margin %': item.margin.toFixed(1),
    }))

    const columns = [
      { key: 'Product', label: 'Product' },
      { key: 'Quantity Sold', label: 'Quantity Sold' },
      { key: 'Revenue', label: 'Revenue' },
      { key: 'Cost', label: 'Cost' },
      { key: 'Profit', label: 'Profit' },
      { key: 'Margin %', label: 'Margin %' },
    ]

    exportTableToCSV(exportData, columns, `profit-analysis-${new Date().toISOString().split('T')[0]}`)
  }

  const handleExportReceivablesCSV = () => {
    const exportData = receivables.map((item: any) => ({
      Customer: item.customerName,
      Phone: item.phone || '',
      'Total Purchases': formatCurrencyForExport(item.totalPurchases),
      'Total Paid': formatCurrencyForExport(item.totalPaid),
      'Outstanding Balance': formatCurrencyForExport(item.balance),
    }))

    const columns = [
      { key: 'Customer', label: 'Customer' },
      { key: 'Phone', label: 'Phone' },
      { key: 'Total Purchases', label: 'Total Purchases' },
      { key: 'Total Paid', label: 'Total Paid' },
      { key: 'Outstanding Balance', label: 'Outstanding Balance' },
    ]

    exportTableToCSV(exportData, columns, `outstanding-receivables-${new Date().toISOString().split('T')[0]}`)
  }

  const handleExportPayablesCSV = () => {
    const exportData = payables.map((item: any) => ({
      Supplier: item.supplierName,
      Contact: item.contact || '',
      'Total Purchases': formatCurrencyForExport(item.totalPurchases),
      'Total Paid': formatCurrencyForExport(item.totalPaid),
      'Outstanding Balance': formatCurrencyForExport(item.balance),
    }))

    const columns = [
      { key: 'Supplier', label: 'Supplier' },
      { key: 'Contact', label: 'Contact' },
      { key: 'Total Purchases', label: 'Total Purchases' },
      { key: 'Total Paid', label: 'Total Paid' },
      { key: 'Outstanding Balance', label: 'Outstanding Balance' },
    ]

    exportTableToCSV(exportData, columns, `outstanding-payables-${new Date().toISOString().split('T')[0]}`)
  }

  const handleExportLoansCSV = () => {
    const exportData = loansReport.map((loan: any) => ({
      Type: loan.type,
      Entity: loan.entityName,
      Amount: formatCurrencyForExport(loan.amount),
      Paid: formatCurrencyForExport(loan.paidAmount),
      Outstanding: formatCurrencyForExport(loan.amount - loan.paidAmount),
      Status: loan.status,
      'Due Date': loan.dueDate ? formatDateForExport(loan.dueDate) : '',
    }))

    const columns = [
      { key: 'Type', label: 'Type' },
      { key: 'Entity', label: 'Entity' },
      { key: 'Amount', label: 'Amount' },
      { key: 'Paid', label: 'Paid' },
      { key: 'Outstanding', label: 'Outstanding' },
      { key: 'Status', label: 'Status' },
      { key: 'Due Date', label: 'Due Date' },
    ]

    exportTableToCSV(exportData, columns, `loans-report-${new Date().toISOString().split('T')[0]}`)
  }

  const handleExportPurchasesCSV = () => {
    const exportData = purchasesReport.map((po: any) => ({
      'Order #': po.orderNumber,
      Supplier: po.supplierName,
      'Total Amount': formatCurrencyForExport(po.totalAmount),
      'Paid Amount': formatCurrencyForExport(po.paidAmount),
      Due: formatCurrencyForExport(po.totalAmount - po.paidAmount),
      Status: po.status,
      Date: formatDateForExport(po.orderDate),
    }))

    const columns = [
      { key: 'Order #', label: 'Order #' },
      { key: 'Supplier', label: 'Supplier' },
      { key: 'Total Amount', label: 'Total Amount' },
      { key: 'Paid Amount', label: 'Paid Amount' },
      { key: 'Due', label: 'Due' },
      { key: 'Status', label: 'Status' },
      { key: 'Date', label: 'Date' },
    ]

    exportTableToCSV(exportData, columns, `purchase-report-${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('pageTitle')} />
      <div className="flex-1 p-6 space-y-6">

        {/* Tabs */}
        <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide">
          {[
            { key: 'overview', label: t('tabs.overview') },
            { key: 'profit', label: t('tabs.profit') },
            { key: 'loans', label: t('tabs.loans') },
            { key: 'purchases', label: t('tabs.purchases') },
            { key: 'cashflow', label: t('tabs.cashflow') },
            { key: 'cheques', label: tc('navigation.cheques') },
          ].map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key as Tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === tabItem.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('filters.from')}</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('filters.to')}</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
          </div>
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: t('overview.kpis.totalRevenue'), value: formatCurrency(sales?.totalRevenue ?? 0), sub: t('overview.kpis.salesCount', { count: sales?.totalSales ?? 0 }), icon: TrendingUp, color: 'text-emerald-500' },
                { label: t('overview.kpis.totalExpenses'), value: formatCurrency(expenses?.totalExpenses ?? 0), sub: t('overview.kpis.entriesCount', { count: expenses?.count ?? 0 }), icon: Receipt, color: 'text-rose-500' },
                { label: t('overview.kpis.netProfit'), value: formatCurrency(profit), sub: profit >= 0 ? t('overview.kpis.profitable') : t('overview.kpis.loss'), icon: TrendingUp, color: profit >= 0 ? 'text-emerald-500' : 'text-rose-500' },
                { label: t('overview.kpis.avgSaleValue'), value: formatCurrency(sales?.avgSaleValue ?? 0), sub: t('overview.kpis.perTransaction'), icon: ShoppingCart, color: 'text-blue-500' },
              ].map(card => (
                <div key={card.label} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{card.label}</span>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Daily Sales + Expenses by Category */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 rounded-lg border bg-card p-4">
                <p className="text-sm font-medium mb-4">{t('overview.dailyRevenue')}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sales?.byDay ?? []} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => formatCurrency(v).replace(/\.00$/, '')} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={l => `${tc('common.date')}: ${l}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-2 rounded-lg border bg-card p-4">
                <p className="text-sm font-medium mb-4">{t('overview.expensesByCategory')}</p>
                {expenses?.byCategory?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={expenses.byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percent }) => `${category.slice(0,3)} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {expenses.byCategory.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">{t('overview.noExpenseData')}</div>}
              </div>
            </div>

            {/* Monthly Revenue vs Expenses */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium">{t('overview.revenueVsExpenses')}</p>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => formatCurrency(v).replace(/\.00$/, '')} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name={t('overview.chartLegend.revenue')} fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="expenses" name={t('overview.chartLegend.expenses')} fill="#f43f5e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Products + Payment Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 rounded-lg border bg-card p-4">
                <p className="text-sm font-medium mb-4">{t('overview.topProductsByRevenue')}</p>
                {topProducts.length ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => formatCurrency(v).replace(/\.00$/, '')} />
                      <YAxis type="category" dataKey="productName" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={90} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm"><Package className="h-5 w-5 mr-2 opacity-40" />{t('overview.noSalesData')}</div>}
              </div>

              <div className="lg:col-span-2 rounded-lg border bg-card p-4">
                <p className="text-sm font-medium mb-4">{t('overview.paymentMethods')}</p>
                {paymentMethods.length ? (
                  <div className="space-y-3">
                    {paymentMethods.map((m: any, i: number) => {
                      const total = paymentMethods.reduce((s: number, x: any) => s + x.total, 0)
                      const pct = total > 0 ? (m.total / total * 100).toFixed(0) : 0
                      return (
                        <div key={m.method}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{m.method}</span>
                            <span className="text-muted-foreground">{formatCurrency(m.total)} · {m.count} {t('overview.salesSuffix')}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">{t('overview.noPaymentData')}</div>}
              </div>
            </div>
          </>
        )}

        {/* Profit Analysis Tab */}
        {tab === 'profit' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('profit.title')}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    {t('export.button')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportProfitCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('export.asCsv')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openExportDialog({
                    title: t('profit.title'),
                    columns: [
                      { key: 'productName', label: t('profit.table.product') },
                      { key: 'quantitySold', label: t('profit.table.quantitySold') },
                      { key: 'revenue', label: t('profit.table.revenue') },
                      { key: 'cost', label: t('profit.table.cost') },
                      { key: 'profit', label: t('profit.table.profit') },
                      { key: 'margin', label: t('profit.table.margin') },
                    ],
                    data: profitData.map((item: any) => ({
                      ...item,
                      margin: `${item.margin.toFixed(1)}%`,
                    })),
                    filename: `profit-analysis-${new Date().toISOString().split('T')[0]}`,
                    filters: activeFilters,
                  })}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('export.asPdf')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('profit.totalRevenue')}</span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(profitData.reduce((s: number, p: any) => s + p.revenue, 0))}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('profit.totalCost')}</span>
                  <Receipt className="h-4 w-4 text-rose-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(profitData.reduce((s: number, p: any) => s + p.cost, 0))}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('profit.totalProfit')}</span>
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(profitData.reduce((s: number, p: any) => s + p.profit, 0))}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('profit.table.product')}</TableHead>
                    <TableHead>{t('profit.table.quantitySold')}</TableHead>
                    <TableHead>{t('profit.table.revenue')}</TableHead>
                    <TableHead>{t('profit.table.cost')}</TableHead>
                    <TableHead>{t('profit.table.profit')}</TableHead>
                    <TableHead>{t('profit.table.margin')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        {t('profit.table.empty')}
                      </TableCell>
                    </TableRow>
                  ) : profitData.map((item: any) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.quantitySold}</TableCell>
                      <TableCell>{formatCurrency(item.revenue)}</TableCell>
                      <TableCell>{formatCurrency(item.cost)}</TableCell>
                      <TableCell className={item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {formatCurrency(item.profit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.margin >= 30 ? 'success' : item.margin >= 15 ? 'default' : 'secondary'}>
                          {item.margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Outstanding Receivables Tab */}
        {tab === 'receivables' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('receivables.title')}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    {t('export.button')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportReceivablesCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('export.asCsv')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openExportDialog({
                    title: t('receivables.title'),
                    columns: [
                      { key: 'customerName', label: t('receivables.table.customer') },
                      { key: 'phone', label: t('receivables.table.phone') },
                      { key: 'totalPurchases', label: t('receivables.table.totalPurchases') },
                      { key: 'totalPaid', label: t('receivables.table.totalPaid') },
                      { key: 'balance', label: t('receivables.table.outstandingBalance') },
                    ],
                    data: receivables,
                    filename: `outstanding-receivables-${new Date().toISOString().split('T')[0]}`,
                    filters: activeFilters,
                  })}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('export.asPdf')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('receivables.totalOutstanding')}</span>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(receivables.reduce((s: number, r: any) => s + r.balance, 0))}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('receivables.numberOfCustomers')}</span>
                  <ShoppingCart className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">{receivables.length}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('receivables.avgBalance')}</span>
                  <DollarSign className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(receivables.length > 0 ? receivables.reduce((s: number, r: any) => s + r.balance, 0) / receivables.length : 0)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('receivables.table.customer')}</TableHead>
                    <TableHead>{t('receivables.table.phone')}</TableHead>
                    <TableHead>{t('receivables.table.totalPurchases')}</TableHead>
                    <TableHead>{t('receivables.table.totalPaid')}</TableHead>
                    <TableHead>{t('receivables.table.outstandingBalance')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        {t('receivables.table.empty')}
                      </TableCell>
                    </TableRow>
                  ) : receivables.map((item: any) => (
                    <TableRow key={item.customerId}>
                      <TableCell className="font-medium">{item.customerName}</TableCell>
                      <TableCell className="text-muted-foreground">{item.phone || '—'}</TableCell>
                      <TableCell>{formatCurrency(item.totalPurchases)}</TableCell>
                      <TableCell>{formatCurrency(item.totalPaid)}</TableCell>
                      <TableCell className="font-semibold text-amber-600">
                        {formatCurrency(item.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Outstanding Payables Tab */}
        {tab === 'payables' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('payables.title')}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    {t('export.button')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportPayablesCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('export.asCsv')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openExportDialog({
                    title: t('payables.title'),
                    columns: [
                      { key: 'supplierName', label: t('payables.table.supplier') },
                      { key: 'contact', label: t('payables.table.contact') },
                      { key: 'totalPurchases', label: t('payables.table.totalPurchases') },
                      { key: 'totalPaid', label: t('payables.table.totalPaid') },
                      { key: 'balance', label: t('payables.table.outstandingBalance') },
                    ],
                    data: payables,
                    filename: `outstanding-payables-${new Date().toISOString().split('T')[0]}`,
                    filters: activeFilters,
                  })}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('export.asPdf')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('payables.totalOutstanding')}</span>
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(payables.reduce((s: number, p: any) => s + p.balance, 0))}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('payables.numberOfSuppliers')}</span>
                  <Package className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">{payables.length}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('payables.avgBalance')}</span>
                  <DollarSign className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(payables.length > 0 ? payables.reduce((s: number, p: any) => s + p.balance, 0) / payables.length : 0)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('payables.table.supplier')}</TableHead>
                    <TableHead>{t('payables.table.contact')}</TableHead>
                    <TableHead>{t('payables.table.totalPurchases')}</TableHead>
                    <TableHead>{t('payables.table.totalPaid')}</TableHead>
                    <TableHead>{t('payables.table.outstandingBalance')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        {t('payables.table.empty')}
                      </TableCell>
                    </TableRow>
                  ) : payables.map((item: any) => (
                    <TableRow key={item.supplierId}>
                      <TableCell className="font-medium">{item.supplierName}</TableCell>
                      <TableCell className="text-muted-foreground">{item.contact || '—'}</TableCell>
                      <TableCell>{formatCurrency(item.totalPurchases)}</TableCell>
                      <TableCell>{formatCurrency(item.totalPaid)}</TableCell>
                      <TableCell className="font-semibold text-rose-600">
                        {formatCurrency(item.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Loans Report Tab */}
        {tab === 'loans' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('loans.title')}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    {t('export.button')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportLoansCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('export.asCsv')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openExportDialog({
                    title: t('loans.title'),
                    columns: [
                      { key: 'type', label: t('loans.table.loanType') },
                      { key: 'entityName', label: t('loans.table.entity') },
                      { key: 'amount', label: t('loans.table.amount') },
                      { key: 'paidAmount', label: t('loans.table.paid') },
                      { key: 'outstanding', label: t('loans.table.outstanding') },
                      { key: 'status', label: t('loans.table.status') },
                      { key: 'dueDate', label: t('loans.table.dueDate') },
                    ],
                    data: loansReport.map((loan: any) => ({
                      ...loan,
                      outstanding: loan.amount - loan.paidAmount,
                      dueDate: loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '',
                    })),
                    filename: `loans-report-${new Date().toISOString().split('T')[0]}`,
                    filters: activeFilters,
                  })}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('export.asPdf')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('loans.totalLoaned')}</span>
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(loansReport.reduce((s: number, l: any) => s + l.amount, 0))}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('loans.totalPaid')}</span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(loansReport.reduce((s: number, l: any) => s + l.paidAmount, 0))}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('loans.outstanding')}</span>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(loansReport.reduce((s: number, l: any) => s + (l.amount - l.paidAmount), 0))}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('loans.activeLoans')}</span>
                  <Receipt className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-2xl font-bold">{loansReport.filter((l: any) => l.status === 'ACTIVE').length}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('loans.table.loanType')}</TableHead>
                    <TableHead>{t('loans.table.entity')}</TableHead>
                    <TableHead>{t('loans.table.amount')}</TableHead>
                    <TableHead>{t('loans.table.paid')}</TableHead>
                    <TableHead>{t('loans.table.outstanding')}</TableHead>
                    <TableHead>{t('loans.table.status')}</TableHead>
                    <TableHead>{t('loans.table.dueDate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loansReport.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        {t('loans.table.empty')}
                      </TableCell>
                    </TableRow>
                  ) : loansReport.map((loan: any) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <Badge variant="outline">{loan.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{loan.entityName}</TableCell>
                      <TableCell>{formatCurrency(loan.amount)}</TableCell>
                      <TableCell>{formatCurrency(loan.paidAmount)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(loan.amount - loan.paidAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          loan.status === 'ACTIVE' ? 'default' :
                          loan.status === 'COMPLETED' ? 'success' : 'secondary'
                        }>
                          {tc(`loans.status.${loan.status}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Purchases Report Tab */}
        {tab === 'purchases' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('purchases.title')}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    {t('export.button')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportPurchasesCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('export.asCsv')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openExportDialog({
                    title: t('purchases.title'),
                    columns: [
                      { key: 'orderNumber', label: t('purchases.table.orderNumber') },
                      { key: 'supplierName', label: t('purchases.table.supplier') },
                      { key: 'totalAmount', label: t('purchases.table.totalAmount') },
                      { key: 'paidAmount', label: t('purchases.table.paidAmount') },
                      { key: 'due', label: t('purchases.table.due') },
                      { key: 'status', label: t('purchases.table.status') },
                      { key: 'orderDate', label: t('purchases.table.date') },
                    ],
                    data: purchasesReport.map((po: any) => ({
                      ...po,
                      due: po.totalAmount - po.paidAmount,
                      orderDate: new Date(po.orderDate).toLocaleDateString(),
                    })),
                    filename: `purchase-report-${new Date().toISOString().split('T')[0]}`,
                    filters: activeFilters,
                  })}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('export.asPdf')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('purchases.totalOrders')}</span>
                  <Package className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">{purchasesReport.length}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('purchases.totalValue')}</span>
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(purchasesReport.reduce((s: number, p: any) => s + p.totalAmount, 0))}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('purchases.totalPaid')}</span>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(purchasesReport.reduce((s: number, p: any) => s + p.paidAmount, 0))}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('purchases.amountDue')}</span>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(purchasesReport.reduce((s: number, p: any) => s + (p.totalAmount - p.paidAmount), 0))}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('purchases.table.orderNumber')}</TableHead>
                    <TableHead>{t('purchases.table.supplier')}</TableHead>
                    <TableHead>{t('purchases.table.totalAmount')}</TableHead>
                    <TableHead>{t('purchases.table.paidAmount')}</TableHead>
                    <TableHead>{t('purchases.table.due')}</TableHead>
                    <TableHead>{t('purchases.table.status')}</TableHead>
                    <TableHead>{t('purchases.table.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchasesReport.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        {t('purchases.table.empty')}
                      </TableCell>
                    </TableRow>
                  ) : purchasesReport.map((po: any) => (
                    <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/purchase-orders/${po.id}`)}>
                      <TableCell className="font-mono text-xs">{po.orderNumber}</TableCell>
                      <TableCell className="font-medium">{po.supplierName}</TableCell>
                      <TableCell>{formatCurrency(po.totalAmount)}</TableCell>
                      <TableCell>{formatCurrency(po.paidAmount)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(po.totalAmount - po.paidAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          po.status === 'RECEIVED' ? 'success' :
                          po.status === 'PENDING' ? 'default' : 'secondary'
                        }>
                          {tc(`purchaseOrders.status.${po.status}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(po.orderDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Cash Flow Tab */}
        {tab === 'cashflow' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('cashflow.cashInflow')}</span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(cashflowData?.totalInflow ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('cashflow.cashInflowSub')}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('cashflow.cashOutflow')}</span>
                  <Receipt className="h-4 w-4 text-rose-500" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(cashflowData?.totalOutflow ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('cashflow.cashOutflowSub')}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('cashflow.netCashFlow')}</span>
                  <DollarSign className={`h-4 w-4 ${(cashflowData?.totalInflow ?? 0) - (cashflowData?.totalOutflow ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                </div>
                <p className="text-2xl font-bold">{formatCurrency((cashflowData?.totalInflow ?? 0) - (cashflowData?.totalOutflow ?? 0))}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(cashflowData?.totalInflow ?? 0) - (cashflowData?.totalOutflow ?? 0) >= 0 ? t('cashflow.positive') : t('cashflow.negative')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-medium mb-4">{t('cashflow.inflowBreakdown')}</p>
                <div className="space-y-3">
                  {[
                    { key: 'salesRevenue', label: t('cashflow.salesRevenue'), value: cashflowData?.salesRevenue ?? 0, color: '#6366f1' },
                    { key: 'customerPayments', label: t('cashflow.customerPayments'), value: cashflowData?.customerPayments ?? 0, color: '#8b5cf6' },
                    { key: 'loanRepayments', label: t('cashflow.loanRepayments'), value: cashflowData?.loanRepayments ?? 0, color: '#ec4899' },
                  ].map((item) => {
                    const total = (cashflowData?.totalInflow ?? 0)
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
                    return (
                      <div key={item.key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-medium mb-4">{t('cashflow.outflowBreakdown')}</p>
                <div className="space-y-3">
                  {[
                    { key: 'purchaseOrders', label: t('cashflow.purchaseOrders'), value: cashflowData?.purchaseOrders ?? 0, color: '#f59e0b' },
                    { key: 'expenses', label: t('cashflow.expenses'), value: cashflowData?.expenses ?? 0, color: '#10b981' },
                    { key: 'supplierPayments', label: t('cashflow.supplierPayments'), value: cashflowData?.supplierPayments ?? 0, color: '#3b82f6' },
                  ].map((item) => {
                    const total = (cashflowData?.totalOutflow ?? 0)
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
                    return (
                      <div key={item.key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Cheques Tab */}
        {tab === 'cheques' && (
          <ChequeReports dateFrom={dateFrom} dateTo={dateTo} />
        )}

      </div>

      {/* Export Dialog */}
      {exportConfig && (
        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          title={exportConfig.title}
          columns={exportConfig.columns}
          data={exportConfig.data}
          filename={exportConfig.filename}
          filters={exportConfig.filters}
          onExportPDF={handleExportPDF}
          onPrint={handlePrint}
        />
      )}
    </div>
  )
}
