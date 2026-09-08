'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, ShoppingCart, Receipt, Users, Package, Store, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatCardSkeleton, ChartSkeleton, ListSkeleton } from '@/components/ui/skeletons'
import { useDashboardStats, useDashboardChartData, useRecentSales, useLowStock } from '@/hooks/use-api'
import { usePrivacyStore } from '@/lib/stores/privacy-store'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatChartLabel(label: string, period: string) {
  if (period === 'day') return label
  if (period === 'year') return MONTHS[parseInt(label.split('-')[1], 10) - 1] ?? label
  return label.slice(5).replace('-', '/')
}

export default function DashboardPage() {
  const router = useRouter()
  const t = useTranslations('dashboard')
  const [period, setPeriod] = useState('week')
  const [salesPage, setSalesPage] = useState(1)
  const [topLimit, setTopLimit] = useState('10')
  const hideNumbers = usePrivacyStore((state) => state.hideNumbers)
  const mask = (v: string) => (hideNumbers ? '••••' : v)

  const PERIODS = [
    { value: 'day', label: t('periods.day') },
    { value: 'week', label: t('periods.week') },
    { value: 'month', label: t('periods.month') },
    { value: 'year', label: t('periods.year') },
  ]

  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: chartData = [], isLoading: chartLoading } = useDashboardChartData(period)
  const { data: recentSalesData, isLoading: salesLoading } = useRecentSales(10, salesPage)
  const recentSales = recentSalesData?.data || []
  const salesMeta = recentSalesData?.meta || { hasNextPage: false, hasPreviousPage: false }
  const { data: lowStock = [], isLoading: stockLoading } = useLowStock(10)

  // Top products by revenue (last 30 days)
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  const dateFrom = thirtyDaysAgo.toISOString().split('T')[0]
  const dateTo = new Date(today)
  dateTo.setDate(dateTo.getDate() + 1) // Add 1 day to include today
  const dateToAdjusted = dateTo.toISOString().split('T')[0]

  const { data: topProducts = [] } = useQuery<any[]>({
    queryKey: ['dashboard-top-products', dateFrom, dateToAdjusted, topLimit],
    queryFn: () => api.get('/reports/top-products', { params: { dateFrom, dateTo: dateToAdjusted, limit: topLimit } }).then(r => r.data),
  })

  const kpis = [
    { label: t('kpis.todayRevenue'), value: mask(formatCurrency(stats?.todaySales ?? 0)), sub: t('kpis.todayRevenueSub', { count: stats?.todaySalesCount ?? 0 }), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', onClick: () => router.push('/revenue') },
    { label: t('kpis.monthlyRevenue'), value: mask(formatCurrency(stats?.monthlyRevenue ?? 0)), sub: t('kpis.monthlyRevenueSub', { count: stats?.monthlySalesCount ?? 0 }), icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10', onClick: () => router.push('/revenue') },
    { label: t('kpis.todayExpenses'), value: mask(formatCurrency(stats?.todayExpenses ?? 0)), sub: t('kpis.todayExpensesSub', { amount: formatCurrency(stats?.monthlyExpenses ?? 0) }), icon: Receipt, color: 'text-rose-500', bg: 'bg-rose-500/10', onClick: () => router.push('/expenses') },
    { label: t('kpis.customers'), value: mask((stats?.totalCustomers ?? 0).toLocaleString()), sub: t('kpis.customersSub', { count: stats?.totalCustomers ?? 0 }), icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10', onClick: () => router.push('/customers') },
    { label: t('kpis.activeProducts'), value: mask((stats?.totalProducts ?? 0).toLocaleString()), sub: t('kpis.activeProductsSub'), icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10', onClick: () => router.push('/products') },
    { label: t('kpis.totalSales'), value: mask((stats?.totalSalesCount ?? 0).toLocaleString()), sub: t('kpis.totalSalesSub'), icon: Store, color: 'text-cyan-500', bg: 'bg-cyan-500/10', onClick: () => router.push('/sales') },
  ]

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('title')} />
      <div className="flex-1 p-3 md:p-6 space-y-5">

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {statsLoading ? (
            Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            kpis.map(k => (
              <div
                key={k.label}
                className="rounded-lg border bg-card p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={k.onClick}
              >
                <div className={`inline-flex p-2 rounded-lg ${k.bg} mb-3`}>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className="text-xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{k.sub}</p>
              </div>
            ))
          )}
        </div>

        {/* Revenue vs expenses chart */}
        <div className="rounded-lg border bg-card p-3 md:p-4">
          <div className="flex items-center justify-between mb-4 gap-2 flex-col sm:flex-row">
            <p className="text-sm font-medium">{t('charts.revenueVsExpenses')}</p>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={l => formatChartLabel(l, period)} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => mask(formatCurrency(v).replace(/\.00$/, ''))} />
              <Tooltip formatter={(v: number) => mask(formatCurrency(v))} labelFormatter={l => formatChartLabel(l, period)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" name="Revenue" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rev)" />
              <Area type="monotone" name="Expenses" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#exp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products by Revenue (Last 30 Days) */}
        <div className="rounded-lg border bg-card p-3 md:p-4">
          <div className="flex items-center justify-between mb-4 gap-2 flex-col sm:flex-row">
            <p className="text-sm font-medium">{t('topProducts.title')}</p>
            <Select value={topLimit} onValueChange={setTopLimit}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['5', '10', '20', '30', '50'].map((n) => (
                  <SelectItem key={n} value={n}>{t('topProducts.show', { count: n })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {topProducts.length ? (
            <ResponsiveContainer width="100%" height={Math.max(240, topProducts.length * 40)}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => mask(formatCurrency(v).replace(/\.00$/, ''))} />
                <YAxis type="category" dataKey="productName" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={120} />
                <Tooltip formatter={(v: number) => mask(formatCurrency(v))} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
              <Package className="h-5 w-5 mr-2 opacity-40" />
              {t('topProducts.noData')}
            </div>
          )}
        </div>

        {/* Recent sales + low stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="p-3 md:p-4 border-b flex items-center justify-between">
              <p className="text-sm font-medium">{t('recentSales.title')}</p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                  disabled={!salesMeta.hasPreviousPage}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSalesPage(p => p + 1)}
                  disabled={!salesMeta.hasNextPage}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{t('recentSales.invoice')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('recentSales.customer')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('recentSales.method')}</TableHead>
                    <TableHead className="text-end whitespace-nowrap">{t('recentSales.total')}</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {!recentSales.length ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{t('recentSales.noRecentSales')}</TableCell></TableRow>
                ) : recentSales.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">{s.customer?.name ?? <span className="text-muted-foreground">{t('recentSales.walkIn')}</span>}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{s.paymentMethod}</Badge></TableCell>
                    <TableCell className="text-end font-semibold text-sm">{mask(formatCurrency(Number(s.total)))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="p-3 md:p-4 border-b flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium">{t('lowStock.title')}</p>
              {lowStock.length > 0 && <Badge variant="destructive" className="ml-auto text-xs">{lowStock.length}</Badge>}
            </div>
            <div className="divide-y">
              {!lowStock.length ? (
                <div className="p-4 text-sm text-muted-foreground text-center">{t('lowStock.allOk')}</div>
              ) : lowStock.map((item: any) => (
                <div key={item.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-bold ${item.quantity === 0 ? 'text-destructive' : 'text-amber-500'}`}>{mask(String(item.quantity))}</span>
                    <p className="text-xs text-muted-foreground">{t('lowStock.min')} {mask(String(item.minStock))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
