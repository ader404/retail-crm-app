'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Download, Filter, ChevronDown, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'

interface ProfitData {
  totalRevenue: number
  totalCost: number
  totalProfit: number
  profitMargin: number
  sales: {
    invoiceNumber: string
    date: string
    customer: string
    revenue: number
    cost: number
    profit: number
    profitMargin: number
    items: {
      productName: string
      quantity: number
      costPrice: number
      sellingPrice: number
      profit: number
    }[]
  }[]
}

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
]

export default function ProfitPage() {
  const router = useRouter()
  const [period, setPeriod] = useState('month')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set())

  const getDateRange = () => {
    if (period === 'custom') {
      return { dateFrom, dateTo }
    }
    const now = new Date()
    const to = now.toISOString().split('T')[0]
    let from = new Date()

    if (period === 'today') {
      from = new Date()
    } else if (period === 'week') {
      from.setDate(from.getDate() - 7)
    } else if (period === 'month') {
      from.setDate(from.getDate() - 30)
    }

    return { dateFrom: from.toISOString().split('T')[0], dateTo: to }
  }

  const { dateFrom: finalDateFrom, dateTo: finalDateTo } = getDateRange()

  const { data, isLoading } = useQuery<ProfitData>({
    queryKey: ['profit-report', finalDateFrom, finalDateTo],
    queryFn: async () => {
      const params: any = { startDate: finalDateFrom, endDate: finalDateTo }
      const { data } = await api.get('/dashboard/net-profit', { params })

      // Transform data to match expected format
      return {
        totalRevenue: data.totalRevenue,
        totalCost: data.totalCost,
        totalProfit: data.totalProfit,
        profitMargin: data.totalRevenue > 0 ? (data.totalProfit / data.totalRevenue) * 100 : 0,
        sales: data.sales.map((sale: any) => ({
          invoiceNumber: sale.invoiceNumber,
          date: sale.date,
          customer: sale.customer,
          revenue: sale.revenue,
          cost: sale.cost,
          profit: sale.profit,
          profitMargin: sale.revenue > 0 ? (sale.profit / sale.revenue) * 100 : 0,
          items: sale.items,
        })),
      }
    },
    enabled: !!finalDateFrom && !!finalDateTo,
  })

  const filteredSales = data?.sales.filter(sale =>
    sale.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    sale.customer.toLowerCase().includes(search.toLowerCase())
  ) || []

  const toggleExpanded = (invoiceNumber: string) => {
    setExpandedSales(prev => {
      const newSet = new Set(prev)
      if (newSet.has(invoiceNumber)) {
        newSet.delete(invoiceNumber)
      } else {
        newSet.add(invoiceNumber)
      }
      return newSet
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Net Profit Analysis" />

      <div className="flex-1 p-3 md:p-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              <span>Total Profit</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data?.totalProfit || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Margin: {(data?.profitMargin || 0).toFixed(1)}%
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="text-muted-foreground text-sm mb-1">Total Revenue</div>
            <div className="text-2xl font-bold">{formatCurrency(data?.totalRevenue || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">{filteredSales.length} sales</div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="text-muted-foreground text-sm mb-1">Total Cost</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(data?.totalCost || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">Cost of goods sold</div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="text-muted-foreground text-sm mb-1">Avg Profit/Sale</div>
            <div className="text-2xl font-bold">
              {filteredSales.length > 0 ? formatCurrency((data?.totalProfit || 0) / filteredSales.length) : formatCurrency(0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Per transaction</div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Period</Label>
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
                  <Label className="text-xs">From Date</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">To Date</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </>
            )}

            <div>
              <Label className="text-xs">Search</Label>
              <Input
                placeholder="Invoice or customer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Profit Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-medium">Profit Breakdown</h3>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-end">Revenue</TableHead>
                  <TableHead className="text-end">Cost</TableHead>
                  <TableHead className="text-end">Profit</TableHead>
                  <TableHead className="text-end">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No sales found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredSales.map(sale => {
                      const isExpanded = expandedSales.has(sale.invoiceNumber)
                      return (
                        <>
                          <TableRow key={sale.invoiceNumber} className="cursor-pointer hover:bg-muted/50">
                            <TableCell onClick={(e) => { e.stopPropagation(); toggleExpanded(sale.invoiceNumber) }}>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs" onClick={() => router.push('/sales')}>{sale.invoiceNumber}</TableCell>
                            <TableCell className="text-sm" onClick={() => router.push('/sales')}>{formatDateTime(sale.date)}</TableCell>
                            <TableCell className="text-sm" onClick={() => router.push('/sales')}>{sale.customer}</TableCell>
                            <TableCell className="text-end" onClick={() => router.push('/sales')}>{formatCurrency(sale.revenue)}</TableCell>
                            <TableCell className="text-end text-red-600" onClick={() => router.push('/sales')}>{formatCurrency(sale.cost)}</TableCell>
                            <TableCell className="text-end font-semibold text-green-600" onClick={() => router.push('/sales')}>{formatCurrency(sale.profit)}</TableCell>
                            <TableCell className="text-end" onClick={() => router.push('/sales')}>{sale.profitMargin.toFixed(1)}%</TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={8} className="bg-muted/30 p-0">
                                <div className="p-4">
                                  <div className="text-sm font-medium mb-2">Product Breakdown:</div>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-xs">Product</TableHead>
                                        <TableHead className="text-xs text-right">Qty</TableHead>
                                        <TableHead className="text-xs text-right">Cost Price</TableHead>
                                        <TableHead className="text-xs text-right">Selling Price</TableHead>
                                        <TableHead className="text-xs text-right">Profit</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {sale.items.map((item, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="text-xs">{item.productName}</TableCell>
                                          <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                                          <TableCell className="text-xs text-right">{formatCurrency(item.costPrice)}</TableCell>
                                          <TableCell className="text-xs text-right">{formatCurrency(item.sellingPrice)}</TableCell>
                                          <TableCell className="text-xs text-right font-semibold text-green-600">
                                            {formatCurrency(item.profit)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
