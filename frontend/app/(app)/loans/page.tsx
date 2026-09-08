'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Plus, Search, Eye, CreditCard, User, Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Loan {
  id: string
  principalAmount: number
  amountPaid: number
  amountDue: number
  dueDate?: string
  status: string
  type: string
  createdAt: string
  customer?: {
    id: string
    name: string
  }
  supplier?: {
    id: string
    name: string
  }
}

export default function LoansPage() {
  const router = useRouter()
  const t = useTranslations('loans')
  const tCommon = useTranslations('common')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeTab, setTypeTab] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER')

  const { data: loansData, isLoading } = useQuery<any>({
    queryKey: ['loans', typeTab, page, limit, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        type: typeTab,
        ...(search && { search }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
      })
      return api.get(`/loans?${params}`).then(r => r.data)
    },
    refetchOnWindowFocus: true,
  })
  const loans = loansData?.data || []
  const meta = loansData?.meta || { total: 0, page: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }

  // Fetch summary statistics from API
  const { data: summary } = useQuery<any>({
    queryKey: ['loans-summary', typeTab],
    queryFn: async () => {
      const params = new URLSearchParams({ type: typeTab })
      return api.get(`/loans/summary?${params}`).then(r => r.data)
    },
    refetchOnWindowFocus: true,
  })

  const stats = summary || { total: 0, paid: 0, outstanding: 0, active: 0, overdue: 0, completed: 0 }

  function getStatusVariant(status: string) {
    switch (status) {
      case 'COMPLETED':
        return 'default'
      case 'ACTIVE':
        return 'secondary'
      case 'OVERDUE':
        return 'destructive'
      case 'CANCELLED':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  function isOverdue(loan: Loan) {
    if (!loan.dueDate || loan.status !== 'ACTIVE') return false
    return new Date(loan.dueDate) < new Date()
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('list.title')} />
      <div className="flex-1 p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{t('list.allLoans')}</h2>
          </div>
          <Button onClick={() => router.push('/loans/new')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('list.createLoan')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('list.summary.totalLoaned')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('list.summary.totalLoanedSub')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('list.summary.totalPaid')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.paid)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('list.summary.totalPaidSub')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('list.summary.outstanding')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.outstanding)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('list.summary.outstandingSub')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('list.summary.activeLoans')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('list.summary.activeLoansSub')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('list.summary.overdue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('list.summary.overdueSub')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Tabs */}
        <Tabs value={typeTab} onValueChange={(v) => { setTypeTab(v as 'CUSTOMER' | 'SUPPLIER'); setPage(1); }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="CUSTOMER" className="gap-2">
                <User className="h-4 w-4" />
                {t('list.tabs.customerLoans')}
              </TabsTrigger>
              <TabsTrigger value="SUPPLIER" className="gap-2">
                <Building2 className="h-4 w-4" />
                {t('list.tabs.supplierLoans')}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('list.searchPlaceholder', { type: typeTab === 'CUSTOMER' ? t('list.searchCustomer') : t('list.searchSupplier') })}
                  className="pl-9 w-full sm:w-64"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('list.statusFilter.all')}</SelectItem>
                  <SelectItem value="ACTIVE">{t('status.ACTIVE')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('status.COMPLETED')}</SelectItem>
                  <SelectItem value="OVERDUE">{t('status.OVERDUE')}</SelectItem>
                  <SelectItem value="CANCELLED">{t('status.CANCELLED')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="CUSTOMER" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="text-center text-muted-foreground py-8">{t('list.loading')}</div>
                ) : loans.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    <p>{t('list.emptyCustomer')}</p>
                  </div>
                ) : (
                  <>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('list.table.customer')}</TableHead>
                          <TableHead>{t('list.table.loanAmount')}</TableHead>
                          <TableHead>{t('list.table.paid')}</TableHead>
                          <TableHead>{t('list.table.balance')}</TableHead>
                          <TableHead>{t('list.table.dueDate')}</TableHead>
                          <TableHead>{t('list.table.status')}</TableHead>
                          <TableHead>{t('list.table.created')}</TableHead>
                          <TableHead className="w-[80px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.map((loan: any) => (
                          <TableRow key={loan.id}>
                            <TableCell className="font-medium">{loan.customer?.name}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(loan.principalAmount)}</TableCell>
                            <TableCell className="text-emerald-600">{formatCurrency(loan.amountPaid)}</TableCell>
                            <TableCell className="text-destructive font-medium">{formatCurrency(loan.amountDue)}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {loan.dueDate ? (
                                <span className={isOverdue(loan) ? 'text-amber-600 font-medium' : ''}>
                                  {formatDate(loan.dueDate)}
                                  {isOverdue(loan) && ` ${t('list.table.overdueTag')}`}
                                </span>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(loan.status)}>
                                {t(`status.${loan.status}`)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">{formatDate(loan.createdAt)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => router.push(`/loans/${loan.id}`)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination Controls */}
                  {meta.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        {tCommon('pagination', { page: meta.page, totalPages: meta.totalPages, total: meta.total })}
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="SUPPLIER" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="text-center text-muted-foreground py-8">{t('list.loading')}</div>
                ) : loans.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    <p>{t('list.emptySupplier')}</p>
                  </div>
                ) : (
                  <>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('list.table.supplier')}</TableHead>
                          <TableHead>{t('list.table.loanAmount')}</TableHead>
                          <TableHead>{t('list.table.paid')}</TableHead>
                          <TableHead>{t('list.table.balance')}</TableHead>
                          <TableHead>{t('list.table.dueDate')}</TableHead>
                          <TableHead>{t('list.table.status')}</TableHead>
                          <TableHead>{t('list.table.created')}</TableHead>
                          <TableHead className="w-[80px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.map((loan: any) => (
                          <TableRow key={loan.id}>
                            <TableCell className="font-medium">{loan.supplier?.name}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(loan.principalAmount)}</TableCell>
                            <TableCell className="text-emerald-600">{formatCurrency(loan.amountPaid)}</TableCell>
                            <TableCell className="text-destructive font-medium">{formatCurrency(loan.amountDue)}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {loan.dueDate ? (
                                <span className={isOverdue(loan) ? 'text-amber-600 font-medium' : ''}>
                                  {formatDate(loan.dueDate)}
                                  {isOverdue(loan) && ` ${t('list.table.overdueTag')}`}
                                </span>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(loan.status)}>
                                {t(`status.${loan.status}`)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">{formatDate(loan.createdAt)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => router.push(`/loans/${loan.id}`)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination Controls */}
                  {meta.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        {tCommon('pagination', { page: meta.page, totalPages: meta.totalPages, total: meta.total })}
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
