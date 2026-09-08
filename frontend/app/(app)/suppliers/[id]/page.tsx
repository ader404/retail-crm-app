'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowLeft, DollarSign, FileText, CreditCard, Package, Receipt, MoreVertical, Plus } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SupplierDetail {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  totalDebt: number
  totalPaid: number
  createdAt: string
  products: {
    id: string
    name: string
    sku: string
    stock: number
    price: number
    cost: number
  }[]
  payments: {
    id: string
    amount: number
    notes?: string
    createdAt: string
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
}

export default function SupplierDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const t = useTranslations('suppliers')
  const tc = useTranslations()
  const queryClient = useQueryClient()
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [loanDialog, setLoanDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [loanForm, setLoanForm] = useState({ amount: '', dueDate: '', notes: '' })
  const [productDialog, setProductDialog] = useState(false)
  const [productForm, setProductForm] = useState({
    name: '', sku: '', barcode: '', categoryId: '', costPrice: '', sellingPrice: '', quantity: '', description: '',
  })

  const { data: supplier, isLoading } = useQuery<SupplierDetail>({
    queryKey: ['supplier', params.id],
    queryFn: () => api.get(`/suppliers/${params.id}`).then(r => r.data),
  })

  const { data: categories = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then(r => r.data),
  })

  const paymentMutation = useMutation({
    mutationFn: (data: { amount: number; notes?: string }) =>
      api.post(`/suppliers/payments`, { supplierId: params.id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier', params.id] })
      toast.success(t('detail.toasts.paymentRecorded'))
      setPaymentDialog(false)
      setPaymentAmount('')
      setPaymentNotes('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('detail.toasts.paymentFailed')),
  })

  const loanMutation = useMutation({
    mutationFn: (data: { amount: number; dueDate?: string; notes?: string }) =>
      api.post('/loans', { supplierId: params.id, type: 'SUPPLIER', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier', params.id] })
      toast.success(t('detail.toasts.loanCreated'))
      setLoanDialog(false)
      setLoanForm({ amount: '', dueDate: '', notes: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('detail.toasts.loanFailed')),
  })

  const updateLoanStatusMutation = useMutation({
    mutationFn: (data: { loanId: string; status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED' }) =>
      api.patch(`/loans/${data.loanId}/status`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier', params.id] })
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
    if (!supplier?.totalDebt || amount > supplier.totalDebt) {
      toast.error(t('detail.toasts.exceedsBalance'))
      return
    }
    paymentMutation.mutate({ amount, notes: paymentNotes || undefined })
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

  function updateLoanStatus(loanId: string, status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED') {
    updateLoanStatusMutation.mutate({ loanId, status })
  }

  const createProductMutation = useMutation({
    mutationFn: (data: any) => api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier', params.id] })
      toast.success(t('detail.productDialog.toastCreated'))
      setProductDialog(false)
      setProductForm({ name: '', sku: '', barcode: '', categoryId: '', costPrice: '', sellingPrice: '', quantity: '', description: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('detail.productDialog.toastFailed')),
  })

  const pf = (k: keyof typeof productForm, v: any) => setProductForm(p => ({ ...p, [k]: v }))

  function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!productForm.categoryId) { toast.error(tc('products.toasts.categoryRequired')); return }
    if (!productForm.name.trim()) { toast.error('Name is required'); return }
    const { quantity, ...rest } = productForm
    createProductMutation.mutate({
      ...rest,
      supplierId: params.id,
      costPrice: Number(productForm.costPrice),
      sellingPrice: Number(productForm.sellingPrice),
      quantity: quantity === '' ? undefined : Number(quantity),
      barcode: productForm.barcode || undefined,
    })
  }

  function viewLedger() {
    router.push(`/suppliers/${params.id}/ledger`)
  }

  function viewHistory() {
    router.push(`/suppliers/${params.id}/history`)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Header title={t('detail.title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{tc('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="flex flex-col flex-1">
        <Header title={t('detail.title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('detail.notFound')}</p>
        </div>
      </div>
    )
  }

  const outstandingBalance = supplier.totalDebt

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('detail.title')} />
      <div className="flex-1 p-6 space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{supplier.name}</h2>
              <p className="text-sm text-muted-foreground">{t('detail.supplierSince', { date: formatDate(supplier.createdAt) })}</p>
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
              <p className="text-muted-foreground">{tc('common.phone')}</p>
              <p className="font-medium">{supplier.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{tc('common.email')}</p>
              <p className="font-medium">{supplier.email ?? '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">{tc('common.address')}</p>
              <p className="font-medium">{supplier.address ?? '—'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.summary.outstandingBalance')}</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(outstandingBalance)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('detail.summary.amountPayable')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.summary.totalPaid')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(supplier.totalPaid)}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('detail.summary.allTime')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('detail.summary.productsSupplied')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{supplier.products.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{t('detail.summary.activeProducts')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Products Supplied */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('detail.productsTable.title')}</CardTitle>
            <Button size="sm" onClick={() => setProductDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('detail.productDialog.addButton')}
            </Button>
          </CardHeader>
          <CardContent>
            {supplier.products.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">{t('detail.productDialog.noProducts')}</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('common.sku')}</TableHead>
                      <TableHead>{t('detail.productsTable.productName')}</TableHead>
                      <TableHead>{t('detail.productsTable.stock')}</TableHead>
                      <TableHead>{t('detail.productsTable.cost')}</TableHead>
                      <TableHead>{t('detail.productsTable.retailPrice')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.products.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><Badge variant="secondary">{p.stock}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{formatCurrency(p.cost)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(p.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        {supplier.payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.paymentHistory.title')}</CardTitle>
            </CardHeader>
            <CardContent>
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
                    {supplier.payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-muted-foreground text-xs">{formatDate(payment.createdAt)}</TableCell>
                        <TableCell className="font-medium text-emerald-600">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell className="text-muted-foreground">{payment.notes ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loans */}
        {supplier.loans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.loanHistory.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc('common.date')}</TableHead>
                      <TableHead>{tc('common.amount')}</TableHead>
                      <TableHead>{tc('common.paid')}</TableHead>
                      <TableHead>{tc('common.balance')}</TableHead>
                      <TableHead>{t('detail.loanHistory.dueDate')}</TableHead>
                      <TableHead>{tc('common.status')}</TableHead>
                      <TableHead className="text-end">{tc('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.loans.map(loan => (
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
                                {t('detail.loanHistory.menu.markActive')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLoanStatus(loan.id, 'COMPLETED')}>
                                {t('detail.loanHistory.menu.markCompleted')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLoanStatus(loan.id, 'OVERDUE')}>
                                {t('detail.loanHistory.menu.markOverdue')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLoanStatus(loan.id, 'CANCELLED')}>
                                {t('detail.loanHistory.menu.markCancelled')}
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
            <DialogTitle>{t('detail.paymentDialog.title')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4 mt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('detail.paymentDialog.outstandingBalance')} <span className="text-destructive font-medium">{formatCurrency(outstandingBalance)}</span>
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
                {paymentMutation.isPending ? t('detail.paymentDialog.recording') : t('detail.paymentDialog.recordButton')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Loan Dialog */}
      <Dialog open={loanDialog} onOpenChange={setLoanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.loanDialog.title')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLoan} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>{t('detail.loanDialog.amountLabel')}</Label>
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
              <Label>{t('detail.loanDialog.dueDateLabel')}</Label>
              <Input
                type="date"
                value={loanForm.dueDate}
                onChange={e => setLoanForm(p => ({ ...p, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.loanDialog.notesLabel')}</Label>
              <Textarea
                placeholder={t('detail.loanDialog.notesPlaceholder')}
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
                {loanMutation.isPending ? t('detail.loanDialog.creating') : t('detail.loanDialog.createButton')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Product Dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('detail.productDialog.title')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProduct} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>{t('detail.productDialog.name')} *</Label>
              <Input value={productForm.name} onChange={e => pf('name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{tc('common.sku')}</Label>
                <Input value={productForm.sku} onChange={e => pf('sku', e.target.value)} placeholder={t('detail.productDialog.skuPlaceholder')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('detail.productDialog.barcode')}</Label>
                <Input value={productForm.barcode} onChange={e => pf('barcode', e.target.value)} placeholder={t('detail.productDialog.barcodePlaceholder')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{tc('common.category')} *</Label>
              <Select value={productForm.categoryId} onValueChange={v => pf('categoryId', v)}>
                <SelectTrigger><SelectValue placeholder={t('detail.productDialog.selectCategory')} /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('detail.productDialog.costPrice')} *</Label>
                <Input type="number" min="0" step="0.01" value={productForm.costPrice} onChange={e => pf('costPrice', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t('detail.productDialog.sellingPrice')} *</Label>
                <Input type="number" min="0" step="0.01" value={productForm.sellingPrice} onChange={e => pf('sellingPrice', e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('detail.productDialog.initialStock')}</Label>
              <Input type="number" min="0" step="1" placeholder="0" value={productForm.quantity} onChange={e => pf('quantity', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{tc('common.description')}</Label>
              <Textarea value={productForm.description} onChange={e => pf('description', e.target.value)} rows={3} placeholder={t('detail.productDialog.descriptionPlaceholder')} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setProductDialog(false)}>
                {tc('actions.cancel')}
              </Button>
              <Button type="submit" disabled={createProductMutation.isPending}>
                {createProductMutation.isPending ? t('detail.productDialog.creating') : t('detail.productDialog.createButton')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
