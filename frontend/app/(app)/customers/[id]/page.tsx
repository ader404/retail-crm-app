'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowLeft, DollarSign, FileText, CreditCard, TrendingUp, Plus, Receipt, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CustomerDetail {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  credit: number
  debt: number
  totalPaid: number
  createdAt: string
  purchases: {
    id: string
    invoiceNumber: string
    total: number
    amountPaid: number
    amountDue: number
    paymentStatus: string
    profit: number
    createdAt: string
    items: { id: string; productName: string; quantity: number; price: number; cost: number; profit: number }[]
  }[]
  loans: {
    id: string
    amount: number
    amountPaid: number
    balance: number
    status: string
    dueDate?: string
    createdAt: string
  }[]
  totalProfit: number
  totalPurchases: number
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const t = useTranslations('customers')
  const tc = useTranslations()
  const tSales = useTranslations('sales')
  const queryClient = useQueryClient()
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [loanDialog, setLoanDialog] = useState(false)
  const [salePaymentDialog, setSalePaymentDialog] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'QR'>('CASH')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [salePaymentAmount, setSalePaymentAmount] = useState('')
  const [salePaymentMethod, setSalePaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'QR'>('CASH')
  const [loanForm, setLoanForm] = useState({ amount: '', dueDate: '', notes: '' })

  const { data: customer, isLoading } = useQuery<CustomerDetail>({
    queryKey: ['customer', params.id],
    queryFn: () => api.get(`/customers/${params.id}`).then(r => r.data),
  })

  const paymentMutation = useMutation({
    mutationFn: (data: { amount: number; method: string; notes?: string }) =>
      api.post(`/customers/${params.id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', params.id] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['sales-all'] })
      toast.success(t('detail.toasts.paymentRecorded'))
      setPaymentDialog(false)
      setPaymentAmount('')
      setPaymentMethod('CASH')
      setPaymentNotes('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('detail.toasts.paymentFailed')),
  })

  const loanMutation = useMutation({
    mutationFn: (data: { amount: number; dueDate?: string; notes?: string }) =>
      api.post('/loans', { customerId: params.id, type: 'CUSTOMER', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', params.id] })
      toast.success(t('detail.toasts.loanCreated'))
      setLoanDialog(false)
      setLoanForm({ amount: '', dueDate: '', notes: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('detail.toasts.loanFailed')),
  })

  const salePaymentMutation = useMutation({
    mutationFn: (data: { saleId: string; amount: number; method: string }) =>
      api.post('/sales/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', params.id] })
      toast.success(t('detail.toasts.paymentRecorded'))
      setSalePaymentDialog(false)
      setSalePaymentAmount('')
      setSelectedSale(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('detail.toasts.paymentFailed')),
  })

  const updateSaleStatusMutation = useMutation({
    mutationFn: (data: { saleId: string; status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' }) =>
      api.patch(`/sales/${data.saleId}/payment-status`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', params.id] })
      toast.success(t('detail.toasts.statusUpdated'))
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('detail.toasts.statusFailed')),
  })

  const updateLoanStatusMutation = useMutation({
    mutationFn: (data: { loanId: string; status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED' }) =>
      api.patch(`/loans/${data.loanId}/status`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', params.id] })
      toast.success(t('detail.toasts.loanStatusUpdated'))
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('detail.toasts.loanStatusFailed')),
  })

  function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('detail.toasts.invalidAmount'))
      return
    }
    if (!customer?.debt || amount > customer.debt) {
      toast.error(t('detail.toasts.amountExceedsBalance'))
      return
    }
    paymentMutation.mutate({ amount, method: paymentMethod, notes: paymentNotes || undefined })
  }

  function handleLoan(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(loanForm.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('detail.toasts.invalidLoanAmount'))
      return
    }
    loanMutation.mutate({
      amount,
      dueDate: loanForm.dueDate || undefined,
      notes: loanForm.notes || undefined,
    })
  }

  function handleSalePayment(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(salePaymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('detail.toasts.invalidAmount'))
      return
    }
    if (!selectedSale || amount > selectedSale.amountDue) {
      toast.error(t('detail.toasts.amountExceedsDue'))
      return
    }
    salePaymentMutation.mutate({
      saleId: String(selectedSale.id),
      amount,
      method: salePaymentMethod,
    })
  }

  function openSalePaymentDialog(sale: any) {
    setSelectedSale(sale)
    setSalePaymentAmount(sale.amountDue.toString())
    setSalePaymentMethod('CASH')
    setSalePaymentDialog(true)
  }

  function updateSaleStatus(saleId: string, status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID') {
    updateSaleStatusMutation.mutate({ saleId, status })
  }

  function updateLoanStatus(loanId: string, status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED') {
    updateLoanStatusMutation.mutate({ loanId, status })
  }

  function viewLedger() {
    router.push(`/customers/${params.id}/ledger`)
  }

  function viewHistory() {
    router.push(`/customers/${params.id}/history`)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Header title={t('detail.header.title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('detail.header.loading')}</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col flex-1">
        <Header title={t('detail.header.title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('detail.header.notFound')}</p>
        </div>
      </div>
    )
  }

  const outstandingBalance = customer.debt
  const profitMargin = customer.totalPurchases > 0 ? (customer.totalProfit / customer.totalPurchases) * 100 : 0

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('detail.header.title')} />
      <div className="flex-1 p-6 space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{customer.name}</h2>
              <p className="text-sm text-muted-foreground">{t('detail.header.customerSince', { date: formatDate(customer.createdAt) })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={viewHistory}>
              <FileText className="h-4 w-4 mr-2" />
              {t('detail.actions.viewHistory')}
            </Button>
            <Button variant="outline" onClick={viewLedger}>
              <FileText className="h-4 w-4 mr-2" />
              {t('detail.actions.viewLedger')}
            </Button>
            {outstandingBalance > 0 && (
              <Button onClick={() => setPaymentDialog(true)}>
                <DollarSign className="h-4 w-4 mr-2" />
                {t('detail.actions.recordPayment')}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setLoanDialog(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              {t('detail.actions.createLoan')}
            </Button>
          </div>
        </div>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.contact.title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t('detail.contact.phone')}</p>
              <p className="font-medium">{customer.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('detail.contact.email')}</p>
              <p className="font-medium">{customer.email ?? '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">{t('detail.contact.address')}</p>
              <p className="font-medium">{customer.address ?? '—'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.summary.outstandingBalance')}</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(outstandingBalance)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('detail.summary.amountDue')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.summary.totalPurchases')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(customer.totalPurchases)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('detail.summary.transactions', { count: customer.purchases.length })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.summary.totalProfit')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(customer.totalProfit)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('detail.summary.margin', { value: profitMargin.toFixed(1) })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.summary.totalPaid')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(customer.totalPaid)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('detail.summary.allTime')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Purchase History */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.purchases.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.purchases.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('detail.purchases.empty')}</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('detail.purchases.table.invoice')}</TableHead>
                      <TableHead>{t('detail.purchases.table.date')}</TableHead>
                      <TableHead>{t('detail.purchases.table.total')}</TableHead>
                      <TableHead>{t('detail.purchases.table.paid')}</TableHead>
                      <TableHead>{t('detail.purchases.table.due')}</TableHead>
                      <TableHead>{t('detail.purchases.table.status')}</TableHead>
                      <TableHead>{t('detail.purchases.table.profit')}</TableHead>
                      <TableHead className="text-end">{t('detail.purchases.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.purchases.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.invoiceNumber}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDate(p.createdAt)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(p.total)}</TableCell>
                        <TableCell className="text-emerald-600">{formatCurrency(p.amountPaid)}</TableCell>
                        <TableCell className="text-destructive">{p.amountDue > 0 ? formatCurrency(p.amountDue) : '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              p.paymentStatus === 'PAID' ? 'default' :
                              p.paymentStatus === 'PARTIALLY_PAID' ? 'secondary' : 'destructive'
                            }
                          >
                            {p.paymentStatus === 'PAID' ? t('detail.purchases.status.paid') :
                             p.paymentStatus === 'PARTIALLY_PAID' ? t('detail.purchases.status.partial') : t('detail.purchases.status.unpaid')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-emerald-600">{formatCurrency(p.profit)}</TableCell>
                        <TableCell className="text-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {p.amountDue > 0 && (
                                <>
                                  <DropdownMenuItem onClick={() => openSalePaymentDialog(p)}>
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    {t('detail.purchases.menu.recordPayment')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem onClick={() => updateSaleStatus(p.id, 'PAID')}>
                                {t('detail.purchases.menu.markPaid')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateSaleStatus(p.id, 'PARTIALLY_PAID')}>
                                {t('detail.purchases.menu.markPartial')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateSaleStatus(p.id, 'UNPAID')}>
                                {t('detail.purchases.menu.markUnpaid')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loans */}
        {customer.loans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.loans.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('detail.loans.table.date')}</TableHead>
                      <TableHead>{t('detail.loans.table.amount')}</TableHead>
                      <TableHead>{t('detail.loans.table.paid')}</TableHead>
                      <TableHead>{t('detail.loans.table.balance')}</TableHead>
                      <TableHead>{t('detail.loans.table.dueDate')}</TableHead>
                      <TableHead>{t('detail.loans.table.status')}</TableHead>
                      <TableHead className="text-end">{t('detail.loans.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.loans.map(loan => (
                      <TableRow key={loan.id}>
                        <TableCell className="text-muted-foreground text-xs">{formatDate(loan.createdAt)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(loan.amount)}</TableCell>
                        <TableCell className="text-emerald-600">{formatCurrency(loan.amountPaid)}</TableCell>
                        <TableCell className="text-destructive">{formatCurrency(loan.balance)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{loan.dueDate ? formatDate(loan.dueDate) : '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              loan.status === 'COMPLETED' ? 'default' :
                              loan.status === 'ACTIVE' ? 'secondary' :
                              loan.status === 'OVERDUE' ? 'destructive' : 'outline'
                            }
                          >
                            {loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => updateLoanStatus(loan.id, 'ACTIVE')}>
                                {t('detail.loans.menu.markActive')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLoanStatus(loan.id, 'COMPLETED')}>
                                {t('detail.loans.menu.markCompleted')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLoanStatus(loan.id, 'OVERDUE')}>
                                {t('detail.loans.menu.markOverdue')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLoanStatus(loan.id, 'CANCELLED')}>
                                {t('detail.loans.menu.markCancelled')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.dialogs.payment.title')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4 mt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('detail.dialogs.payment.outstandingBalance')} <span className="text-destructive font-medium">{formatCurrency(outstandingBalance)}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.dialogs.payment.amountLabel')}</Label>
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
              <Label>{t('detail.dialogs.payment.methodLabel')}</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{tSales('paymentMethods.CASH')}</SelectItem>
                  <SelectItem value="CARD">{tSales('paymentMethods.CARD')}</SelectItem>
                  <SelectItem value="BANK_TRANSFER">{tSales('paymentMethods.BANK_TRANSFER')}</SelectItem>
                  <SelectItem value="QR">{tSales('paymentMethods.QR')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.dialogs.payment.notesLabel')}</Label>
              <Textarea
                placeholder={t('detail.dialogs.payment.notesPlaceholder')}
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
                {paymentMutation.isPending ? t('detail.dialogs.payment.submitting') : t('detail.dialogs.payment.submit')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Loan Dialog */}
      <Dialog open={loanDialog} onOpenChange={setLoanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.dialogs.loan.title')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLoan} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>{t('detail.dialogs.loan.amountLabel')}</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={loanForm.amount}
                onChange={e => setLoanForm(p => ({ ...p, amount: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.dialogs.loan.dueDateLabel')}</Label>
              <Input
                type="date"
                value={loanForm.dueDate}
                onChange={e => setLoanForm(p => ({ ...p, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.dialogs.loan.notesLabel')}</Label>
              <Textarea
                placeholder={t('detail.dialogs.loan.notesPlaceholder')}
                value={loanForm.notes}
                onChange={e => setLoanForm(p => ({ ...p, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLoanDialog(false)}>
                {tc('actions.cancel')}
              </Button>
              <Button type="submit" disabled={loanMutation.isPending}>
                {loanMutation.isPending ? t('detail.dialogs.loan.submitting') : t('detail.dialogs.loan.submit')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sale Payment Dialog */}
      <Dialog open={salePaymentDialog} onOpenChange={setSalePaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.dialogs.salePayment.titlePrefix')} {selectedSale?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalePayment} className="space-y-4 mt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('detail.dialogs.salePayment.amountDue')} <span className="text-destructive font-medium">{selectedSale ? formatCurrency(selectedSale.amountDue) : '—'}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.dialogs.salePayment.amountLabel')}</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={salePaymentAmount}
                onChange={e => setSalePaymentAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.dialogs.salePayment.methodLabel')}</Label>
              <Select value={salePaymentMethod} onValueChange={(v: any) => setSalePaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{tSales('paymentMethods.CASH')}</SelectItem>
                  <SelectItem value="CARD">{tSales('paymentMethods.CARD')}</SelectItem>
                  <SelectItem value="BANK_TRANSFER">{tSales('paymentMethods.BANK_TRANSFER')}</SelectItem>
                  <SelectItem value="QR">{tSales('paymentMethods.QR')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSalePaymentDialog(false)}>
                {tc('actions.cancel')}
              </Button>
              <Button type="submit" disabled={salePaymentMutation.isPending}>
                {salePaymentMutation.isPending ? t('detail.dialogs.salePayment.submitting') : t('detail.dialogs.salePayment.submit')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
