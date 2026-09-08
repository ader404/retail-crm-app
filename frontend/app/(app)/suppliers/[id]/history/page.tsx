'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ShoppingBag, DollarSign, CreditCard, Package, FileText } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SupplierHistory {
  supplier: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  activities: Array<{
    id: string
    type: 'PURCHASE_ORDER' | 'PAYMENT' | 'LOAN_CREATED' | 'LOAN_PAYMENT'
    date: string
    amount: number
    reference: string
    description: string
    status?: string
    metadata?: any
  }>
  summary: {
    totalPurchases: number
    totalPayments: number
    totalLoans: number
    currentDebt: number
  }
}

export default function SupplierHistoryPage({ params }: { params: { id: string } }) {
  const t = useTranslations('suppliers')
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)

  const { data: history, isLoading } = useQuery<SupplierHistory>({
    queryKey: ['supplier-history', params.id, startDate, endDate],
    queryFn: () => api.get(`/suppliers/${params.id}/history`, {
      params: { startDate, endDate }
    }).then(r => r.data),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Header title={t('history.title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('history.loading')}</p>
        </div>
      </div>
    )
  }

  if (!history) {
    return (
      <div className="flex flex-col flex-1">
        <Header title={t('history.title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('history.notFound')}</p>
        </div>
      </div>
    )
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'PURCHASE_ORDER': return <ShoppingBag className="h-4 w-4" />
      case 'PAYMENT': return <DollarSign className="h-4 w-4" />
      case 'LOAN_CREATED': return <CreditCard className="h-4 w-4" />
      case 'LOAN_PAYMENT': return <DollarSign className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  function getActivityColor(type: string) {
    switch (type) {
      case 'PURCHASE_ORDER': return 'text-blue-600'
      case 'PAYMENT': return 'text-emerald-600'
      case 'LOAN_CREATED': return 'text-purple-600'
      case 'LOAN_PAYMENT': return 'text-emerald-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('history.title')} />
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{history.supplier.name}</h2>
              <p className="text-sm text-muted-foreground">{t('history.activityHistory')}</p>
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('history.dateFilter.startDate')}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('history.dateFilter.endDate')}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('history.summary.totalPurchases')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(history.summary.totalPurchases)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('history.summary.totalPayments')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(history.summary.totalPayments)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('history.summary.totalLoans')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(history.summary.totalLoans)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('history.summary.currentDebt')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(history.summary.currentDebt)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>{t('history.timeline.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {history.activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('history.timeline.empty')}</p>
            ) : (
              <div className="space-y-4">
                {history.activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg border">
                    <div className={`p-2 rounded-full ${getActivityColor(activity.type)} bg-opacity-10`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{activity.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(activity.date)} • {activity.reference}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            activity.type === 'PAYMENT' || activity.type === 'LOAN_PAYMENT'
                              ? 'text-emerald-600'
                              : ''
                          }`}>
                            {activity.type === 'PAYMENT' || activity.type === 'LOAN_PAYMENT' ? '-' : ''}
                            {formatCurrency(activity.amount)}
                          </p>
                          {activity.status && (
                            <Badge variant="secondary" className="mt-1">
                              {activity.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
