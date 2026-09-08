'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowLeft, DollarSign, Calendar, User, Building2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

interface LoanDetail {
  id: string
  principalAmount: number
  amountPaid: number
  amountDue: number
  dueDate?: string
  status: string
  type: string
  reason?: string
  createdAt: string
  customer?: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  supplier?: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  payments: {
    id: string
    amount: number
    paymentMethod: string
    reference?: string
    notes?: string
    createdAt: string
  }[]
}

export default function LoanDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useTranslations('loans')
  const tc = useTranslations()
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [statusDialog, setStatusDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [newStatus, setNewStatus] = useState('')

  const { data: loan, isLoading } = useQuery<LoanDetail>({
    queryKey: ['loan', params.id],
    queryFn: () => api.get(`/loans/${params.id}`).then(r => r.data),
  })

  const paymentMutation = useMutation({
    mutationFn: (data: { amount: number; paymentMethod: string; notes?: string }) =>
      api.post('/loans/payments', { loanId: params.id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan', params.id] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer'] })
      toast.success(t('detail.toasts.paymentRecorded'))
      setPaymentDialog(false)
      setPaymentAmount('')
      setPaymentMethod('CASH')
      setPaymentNotes('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('detail.toasts.paymentFailed')),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/loans/${params.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan', params.id] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      toast.success(t('detail.toasts.statusUpdated'))
      setStatusDialog(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('detail.toasts.statusFailed')),
  })

  function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('detail.toasts.invalidAmount'))
      return
    }
    if (!loan || amount > Number(loan.amountDue)) {
      toast.error(t('detail.toasts.amountExceeds'))
      return
    }
    paymentMutation.mutate({ amount, paymentMethod, notes: paymentNotes || undefined })
  }

  function handleStatusChange(e: React.FormEvent) {
    e.preventDefault()
    if (!newStatus) {
      toast.error(t('detail.toasts.selectStatus'))
      return
    }
    statusMutation.mutate(newStatus)
  }

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

  function isOverdue() {
    if (!loan?.dueDate || loan?.status !== 'ACTIVE') return false
    return new Date(loan.dueDate) < new Date()
  }

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Header title={t('detail.pageTitle')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('detail.loading')}</p>
        </div>
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="flex flex-col flex-1">
        <Header title={t('detail.pageTitle')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('detail.notFound')}</p>
        </div>
      </div>
    )
  }

  const entity = loan.customer || loan.supplier
  const entityLabel = loan.type === 'CUSTOMER_LOAN' ? t('detail.entity.customer') : t('detail.entity.supplier')
  const paymentPercentage = Number(loan.principalAmount) > 0 ? (Number(loan.amountPaid) / Number(loan.principalAmount)) * 100 : 0

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('detail.pageTitle')} />
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{t('detail.heading', { entity: entityLabel })}</h2>
              <p className="text-sm text-muted-foreground">
                {t('detail.createdOn', { date: formatDate(loan.createdAt) })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setStatusDialog(true)}>
              {t('detail.updateStatus')}
            </Button>
            {Number(loan.amountDue) > 0 && loan.status === 'ACTIVE' && (
              <Button onClick={() => setPaymentDialog(true)}>
                <DollarSign className="h-4 w-4 mr-2" />
                {t('detail.recordPayment')}
              </Button>
            )}
          </div>
        </div>

        {/* Overdue Alert */}
        {isOverdue() && (
          <div className="rounded-lg border border-amber-500 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">{t('detail.overdueAlert.title')}</p>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                {t('detail.overdueAlert.message', { date: formatDate(loan.dueDate!), entity: entityLabel.toLowerCase() })}
              </p>
            </div>
          </div>
        )}

        {/* Entity Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {loan.type === 'CUSTOMER_LOAN' ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              {entityLabel} {t('detail.entityInfo.titleSuffix')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{tc('common.name')}</p>
              <p className="font-medium">{entity?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{tc('common.phone')}</p>
              <p className="font-medium">{entity?.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{tc('common.email')}</p>
              <p className="font-medium">{entity?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{tc('common.status')}</p>
              <Badge variant={getStatusVariant(loan.status)}>{t(`status.${loan.status}`)}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Loan Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.cards.loanAmount')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(loan.principalAmount)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('detail.cards.originalAmount')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.cards.amountPaid')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(loan.amountPaid)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('detail.cards.paidPercent', { percent: paymentPercentage.toFixed(1) })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.cards.outstandingBalance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(loan.amountDue)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('detail.cards.remainingPercent', { percent: (100 - paymentPercentage).toFixed(1) })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.cards.dueDate')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isOverdue() ? 'text-amber-600' : ''}`}>
                {loan.dueDate ? formatDate(loan.dueDate) : t('detail.cards.noDueDate')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isOverdue() ? t('detail.cards.overdue') : loan.dueDate ? t('detail.cards.scheduled') : t('detail.cards.openEnded')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.progress.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('detail.progress.paid', { amount: formatCurrency(loan.amountPaid) })}</span>
                <span className="text-muted-foreground">{t('detail.progress.remaining', { amount: formatCurrency(loan.amountDue) })}</span>
              </div>
              <div className="h-4 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${paymentPercentage}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">{t('detail.progress.complete', { percent: paymentPercentage.toFixed(1) })}</p>
            </div>
          </CardContent>
        </Card>

        {/* Loan Notes */}
        {loan.reason && (
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.reason')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{loan.reason}</p>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.paymentHistory.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loan.payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('detail.paymentHistory.empty')}</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('common.date')}</TableHead>
                      <TableHead>{tc('common.amount')}</TableHead>
                      <TableHead>{tc('common.notes')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loan.payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(payment.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium text-emerald-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.notes ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.paymentDialog.title')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4 mt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('detail.paymentDialog.outstandingBalance')} <span className="text-destructive font-medium">{formatCurrency(loan.amountDue)}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.paymentDialog.amountLabel')}</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.paymentDialog.methodLabel')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t('paymentMethods.CASH')}</SelectItem>
                  <SelectItem value="CARD">{t('paymentMethods.CARD')}</SelectItem>
                  <SelectItem value="BANK_TRANSFER">{t('paymentMethods.BANK_TRANSFER')}</SelectItem>
                  <SelectItem value="QR">{t('paymentMethods.QR')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.paymentDialog.notesLabel')}</Label>
              <Textarea
                placeholder={t('detail.paymentDialog.notesPlaceholder')}
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPaymentDialog(false)}>
                {tc('actions.cancel')}
              </Button>
              <Button type="submit" disabled={paymentMutation.isPending}>
                {paymentMutation.isPending ? t('detail.paymentDialog.recording') : t('detail.paymentDialog.submit')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.statusDialog.title')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStatusChange} className="space-y-4 mt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('detail.statusDialog.currentStatus')} <Badge variant={getStatusVariant(loan.status)}>{t(`status.${loan.status}`)}</Badge>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.statusDialog.newStatusLabel')}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t('detail.statusDialog.newStatusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{t('status.ACTIVE')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('status.COMPLETED')}</SelectItem>
                  <SelectItem value="OVERDUE">{t('status.OVERDUE')}</SelectItem>
                  <SelectItem value="CANCELLED">{t('status.CANCELLED')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStatusDialog(false)}>
                {tc('actions.cancel')}
              </Button>
              <Button type="submit" disabled={statusMutation.isPending}>
                {statusMutation.isPending ? t('detail.statusDialog.updating') : t('detail.statusDialog.submit')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
