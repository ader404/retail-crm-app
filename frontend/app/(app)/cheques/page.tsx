'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  Plus, Search, Eye, Pencil, Trash2, Landmark, ChevronLeft, ChevronRight,
  ArrowDownToLine, ArrowUpFromLine, Clock, AlertTriangle, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

interface Cheque {
  id: string
  chequeNumber: string
  type: string
  amount: number
  issueDate?: string
  dueDate: string
  bankName?: string
  accountReference?: string
  status: string
  partyName?: string
  customerId?: string
  supplierId?: string
  saleId?: string
  purchaseOrderId?: string
  notes?: string
  clearedAt?: string
  createdAt: string
  customer?: { id: string; name: string; phone?: string }
  supplier?: { id: string; companyName: string; contactPerson?: string }
  sale?: { id: string; invoiceNumber: string; total: number }
  purchaseOrder?: { id: string; orderNumber: string; total: number }
  creator: { id: string; name: string }
  statusHistory: Array<{
    id: string
    previousStatus?: string
    newStatus: string
    changedBy: string
    notes?: string
    createdAt: string
    changer: { id: string; name: string }
  }>
}

interface Summary {
  toReceive: { total: number; count: number }
  toPay: { total: number; count: number }
  dueSoon: { total: number; count: number }
  overdue: { total: number; count: number }
}

const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'warning' | 'secondary' | 'success'> = {
  PENDING: 'secondary',
  DEPOSITED: 'default',
  PRESENTED: 'default',
  CLEARED: 'success',
  BOUNCED: 'destructive',
  RETURNED: 'destructive',
  CANCELLED: 'destructive',
}

const defaultForm = {
  chequeNumber: '',
  type: 'INCOMING',
  amount: '',
  issueDate: '',
  dueDate: '',
  bankName: '',
  accountReference: '',
  partyName: '',
  customerId: '',
  supplierId: '',
  saleId: '',
  purchaseOrderId: '',
  notes: '',
}

export default function ChequesPage() {
  const t = useTranslations('cheques')
  const tc = useTranslations()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [activeTab, setActiveTab] = useState('all')
  const [filterType, setFilterType] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Cheque | null>(null)
  const [form, setForm] = useState(defaultForm)

  const [viewing, setViewing] = useState<Cheque | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusForm, setStatusForm] = useState({ status: '', notes: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const isOverdue = (cheque: Cheque) => {
    const now = new Date()
    const due = new Date(cheque.dueDate)
    return due < now && !['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'].includes(cheque.status)
  }

  const isDueSoon = (cheque: Cheque) => {
    const now = new Date()
    const due = new Date(cheque.dueDate)
    const sevenDays = new Date(now)
    sevenDays.setDate(now.getDate() + 7)
    return due >= now && due <= sevenDays && !['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'].includes(cheque.status)
  }

  const { data: summaryData } = useQuery<Summary>({
    queryKey: ['cheques-summary'],
    queryFn: () => api.get('/cheques/summary').then(r => r.data),
  })

  const { data: customersData } = useQuery<any[]>({
    queryKey: ['customers-list'],
    queryFn: () => api.get('/customers?limit=500').then(r => r.data?.data || []),
  })

  const { data: suppliersData } = useQuery<any[]>({
    queryKey: ['suppliers-list'],
    queryFn: () => api.get('/suppliers?limit=500').then(r => r.data?.data || []),
  })

  const buildParams = () => {
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
    }
    if (search) params.search = search

    if (activeTab === 'incoming') params.type = 'INCOMING'
    else if (activeTab === 'outgoing') params.type = 'OUTGOING'
    else if (filterType !== 'ALL') params.type = filterType

    if (activeTab === 'problems') {
      params.status = 'BOUNCED'
    } else if (filterStatus !== 'ALL') {
      params.status = filterStatus
    }

    return params
  }

  const { data: chequesData, isLoading } = useQuery<any>({
    queryKey: ['cheques-all', page, limit, search, activeTab, filterType, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams(buildParams())
      return api.get(`/cheques?${params}`).then(r => r.data)
    },
  })

  const allCheques = chequesData?.data || []
  const meta = chequesData?.meta || { total: 0, page: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }

  const cheques = activeTab === 'dueSoon'
    ? allCheques.filter((c: Cheque) => isDueSoon(c))
    : activeTab === 'overdue'
    ? allCheques.filter((c: Cheque) => isOverdue(c))
    : activeTab === 'problems'
    ? allCheques.filter((c: Cheque) => ['BOUNCED', 'RETURNED', 'CANCELLED'].includes(c.status))
    : allCheques

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const payload: any = {
        chequeNumber: data.chequeNumber,
        type: data.type,
        amount: parseFloat(data.amount),
        dueDate: data.dueDate,
        userId: JSON.parse(localStorage.getItem('user') || '{}').id,
      }
      if (data.issueDate) payload.issueDate = data.issueDate
      if (data.bankName) payload.bankName = data.bankName
      if (data.accountReference) payload.accountReference = data.accountReference
      if (data.partyName) payload.partyName = data.partyName
      if (data.customerId) payload.customerId = data.customerId
      if (data.supplierId) payload.supplierId = data.supplierId
      if (data.saleId) payload.saleId = data.saleId
      if (data.purchaseOrderId) payload.purchaseOrderId = data.purchaseOrderId
      if (data.notes) payload.notes = data.notes
      return api.post('/cheques', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques-all'] })
      queryClient.invalidateQueries({ queryKey: ['cheques-summary'] })
      toast.success(t('toast.created'))
      closeDialog()
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toast.failed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/cheques/${id}`, { ...data, amount: data.amount ? parseFloat(data.amount) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques-all'] })
      queryClient.invalidateQueries({ queryKey: ['cheques-summary'] })
      toast.success(t('toast.updated'))
      closeDialog()
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toast.failed')),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/cheques/${id}/status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques-all'] })
      queryClient.invalidateQueries({ queryKey: ['cheques-summary'] })
      toast.success(t('toast.statusChanged'))
      setStatusDialogOpen(false)
      setViewing(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toast.failed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cheques/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques-all'] })
      queryClient.invalidateQueries({ queryKey: ['cheques-summary'] })
      toast.success(t('toast.deleted'))
      setDeleteConfirm(null)
      setViewing(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toast.deleteFailed')),
  })

  function openCreate() {
    setEditing(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  function openEdit(c: Cheque) {
    setEditing(c)
    setForm({
      chequeNumber: c.chequeNumber,
      type: c.type,
      amount: String(c.amount),
      issueDate: c.issueDate ? c.issueDate.slice(0, 10) : '',
      dueDate: c.dueDate.slice(0, 10),
      bankName: c.bankName ?? '',
      accountReference: c.accountReference ?? '',
      partyName: c.partyName ?? '',
      customerId: c.customerId ?? '',
      supplierId: c.supplierId ?? '',
      saleId: c.saleId ?? '',
      purchaseOrderId: c.purchaseOrderId ?? '',
      notes: c.notes ?? '',
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
    setForm(defaultForm)
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.chequeNumber) return toast.error(t('validation.chequeNumberRequired'))
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error(t('validation.amountRequired'))
    if (!form.dueDate) return toast.error(t('validation.dueDateRequired'))

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  function openStatusChange(c: Cheque) {
    setStatusForm({ status: '', notes: '' })
    setViewing(c)
    setStatusDialogOpen(true)
  }

  function handleStatusChange() {
    if (!statusForm.status || !viewing) return
    statusMutation.mutate({ id: viewing.id, data: statusForm })
  }

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))
  const isPending = createMutation.isPending || updateMutation.isPending

  const summary = summaryData || { toReceive: { total: 0, count: 0 }, toPay: { total: 0, count: 0 }, dueSoon: { total: 0, count: 0 }, overdue: { total: 0, count: 0 } }

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('title')} />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {tc('actions.add')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setActiveTab('incoming')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('cards.toReceive')}</CardTitle>
              <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.toReceive.total)}</div>
              <p className="text-xs text-muted-foreground">{summary.toReceive.count} {t('cards.cheques')}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setActiveTab('outgoing')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('cards.toPay')}</CardTitle>
              <ArrowUpFromLine className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.toPay.total)}</div>
              <p className="text-xs text-muted-foreground">{summary.toPay.count} {t('cards.cheques')}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setActiveTab('dueSoon')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('cards.dueSoon')}</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.dueSoon.total)}</div>
              <p className="text-xs text-muted-foreground">{summary.dueSoon.count} {t('cards.cheques')}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setActiveTab('overdue')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('cards.overdue')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.overdue.total)}</div>
              <p className="text-xs text-muted-foreground">{summary.overdue.count} {t('cards.cheques')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1) }}>
          <TabsList>
            <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
            <TabsTrigger value="incoming">{t('tabs.incoming')}</TabsTrigger>
            <TabsTrigger value="outgoing">{t('tabs.outgoing')}</TabsTrigger>
            <TabsTrigger value="dueSoon">{t('tabs.dueSoon')}</TabsTrigger>
            <TabsTrigger value="overdue">{t('tabs.overdue')}</TabsTrigger>
            <TabsTrigger value="problems">{t('tabs.problems')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          {activeTab === 'all' && (
            <>
              <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1) }}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder={t('table.type')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{tc('common.all')}</SelectItem>
                  <SelectItem value="INCOMING">{t('types.INCOMING')}</SelectItem>
                  <SelectItem value="OUTGOING">{t('types.OUTGOING')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1) }}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder={t('table.status')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{tc('common.all')}</SelectItem>
                  {['PENDING', 'DEPOSITED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'RETURNED', 'CANCELLED'].map(s => (
                    <SelectItem key={s} value={s}>{t(`statuses.${s}` as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <div className="ml-auto text-sm text-muted-foreground">{t('records', { count: meta.total })}</div>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.number')}</TableHead>
                <TableHead>{t('table.type')}</TableHead>
                <TableHead>{t('table.party')}</TableHead>
                <TableHead>{t('table.bank')}</TableHead>
                <TableHead className="text-end">{t('table.amount')}</TableHead>
                <TableHead>{t('table.issueDate')}</TableHead>
                <TableHead>{t('table.dueDate')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">{tc('common.loading')}</TableCell>
                </TableRow>
              ) : cheques.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-1">
                      <Landmark className="h-5 w-5 opacity-40" />
                      <span>{tc('common.noData')}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : cheques.map((c: Cheque) => (
                <TableRow key={c.id} className={isOverdue(c) ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-mono text-xs font-medium">{c.chequeNumber}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      c.type === 'INCOMING' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {c.type === 'INCOMING' ? <ArrowDownToLine className="h-3 w-3 mr-1" /> : <ArrowUpFromLine className="h-3 w-3 mr-1" />}
                      {t(`types.${c.type}` as any)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.customer?.name || c.supplier?.companyName || c.partyName || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.bankName || '—'}</TableCell>
                  <TableCell className="text-end font-medium">{formatCurrency(c.amount)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {c.issueDate ? formatDate(c.issueDate) : '—'}
                  </TableCell>
                  <TableCell className={`text-xs ${isOverdue(c) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {formatDate(c.dueDate)}
                    {isOverdue(c) && <span className="ml-1 text-destructive">!</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[c.status] || 'default'}>
                      {t(`statuses.${c.status}` as any)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(c)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {tc('common.page')} {meta.page} {tc('common.of')} {meta.totalPages} ({meta.total} {tc('common.total')})
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={!meta.hasPreviousPage || isLoading}>
                <ChevronLeft className="h-4 w-4 mr-1" />{tc('common.previous')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!meta.hasNextPage || isLoading}>
                {tc('common.next')}<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('form.editTitle') : t('form.addTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('form.chequeNumber')} *</Label>
                <Input value={form.chequeNumber} onChange={e => f('chequeNumber', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.type')} *</Label>
                <Select value={form.type} onValueChange={v => f('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOMING">{t('types.INCOMING')}</SelectItem>
                    <SelectItem value="OUTGOING">{t('types.OUTGOING')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('form.amount')} *</Label>
                <Input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => f('amount', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.bankName')}</Label>
                <Input value={form.bankName} onChange={e => f('bankName', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('form.issueDate')}</Label>
                <Input type="date" value={form.issueDate} onChange={e => f('issueDate', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.dueDate')} *</Label>
                <Input type="date" value={form.dueDate} onChange={e => f('dueDate', e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.accountReference')}</Label>
              <Input value={form.accountReference} onChange={e => f('accountReference', e.target.value)} />
            </div>

            {/* Party */}
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">{form.type === 'INCOMING' ? t('form.receivedFrom') : t('form.payableTo')}</p>
              <div className="grid grid-cols-2 gap-3">
                {form.type === 'INCOMING' ? (
                  <div className="space-y-1.5">
                    <Label>{t('form.customerId')}</Label>
                    <Select value={form.customerId} onValueChange={v => { f('customerId', v); f('partyName', '') }}>
                      <SelectTrigger><SelectValue placeholder={t('form.selectCustomer')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t('form.otherParty')}</SelectItem>
                        {(customersData || []).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>{t('form.supplierId')}</Label>
                    <Select value={form.supplierId} onValueChange={v => { f('supplierId', v); f('partyName', '') }}>
                      <SelectTrigger><SelectValue placeholder={t('form.selectSupplier')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t('form.otherParty')}</SelectItem>
                        {(suppliersData || []).map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.companyName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!form.customerId && !form.supplierId && (
                  <div className="space-y-1.5">
                    <Label>{t('form.partyName')}</Label>
                    <Input value={form.partyName} onChange={e => f('partyName', e.target.value)} placeholder={form.type === 'INCOMING' ? t('form.receivedFrom') : t('form.payableTo')} />
                  </div>
                )}
              </div>
            </div>

            {/* Optional Relations */}
            <div className="border-t pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('form.saleId')}</Label>
                  <Input value={form.saleId} onChange={e => f('saleId', e.target.value)} placeholder="Sale ID (optional)" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.purchaseOrderId')}</Label>
                  <Input value={form.purchaseOrderId} onChange={e => f('purchaseOrderId', e.target.value)} placeholder="PO ID (optional)" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('form.notes')}</Label>
              <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeDialog}>{t('form.cancel')}</Button>
              <Button type="submit" disabled={isPending}>{isPending ? t('form.saving') : t('form.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={!!viewing && !statusDialogOpen} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono">{viewing?.chequeNumber}</span>
              {viewing && <Badge variant={STATUS_VARIANTS[viewing.status]}>{t(`statuses.${viewing.status}` as any)}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 mt-2">
              {/* Amount */}
              <div className="text-center py-3">
                <p className="text-3xl font-bold">{formatCurrency(viewing.amount)}</p>
                <p className={`text-sm font-medium mt-1 ${viewing.type === 'INCOMING' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t(`types.${viewing.type}` as any)}
                </p>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">{t('detail.party')}</span>
                <span>{viewing.customer?.name || viewing.supplier?.companyName || viewing.partyName || '—'}</span>
                <span className="text-muted-foreground">{t('detail.bank')}</span>
                <span>{viewing.bankName || '—'}</span>
                {viewing.accountReference && (
                  <>
                    <span className="text-muted-foreground">{t('detail.accountRef')}</span>
                    <span>{viewing.accountReference}</span>
                  </>
                )}
                <span className="text-muted-foreground">{t('detail.issueDate')}</span>
                <span>{viewing.issueDate ? formatDate(viewing.issueDate) : '—'}</span>
                <span className="text-muted-foreground">{t('detail.dueDate')}</span>
                <span className={isOverdue(viewing) ? 'text-destructive font-medium' : ''}>{formatDate(viewing.dueDate)}</span>
                <span className="text-muted-foreground">{t('detail.createdBy')}</span>
                <span>{viewing.creator.name}</span>
                <span className="text-muted-foreground">{t('detail.createdDate')}</span>
                <span>{formatDateTime(viewing.createdAt)}</span>
                {viewing.clearedAt && (
                  <>
                    <span className="text-muted-foreground">{t('detail.clearedAt')}</span>
                    <span>{formatDateTime(viewing.clearedAt)}</span>
                  </>
                )}
              </div>

              {/* Linked Records */}
              {(viewing.sale || viewing.purchaseOrder) && (
                <div className="border-t pt-3 space-y-2 text-sm">
                  {viewing.sale && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('detail.linkedSale')}</span>
                      <span className="font-mono">{viewing.sale.invoiceNumber} ({formatCurrency(viewing.sale.total)})</span>
                    </div>
                  )}
                  {viewing.purchaseOrder && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('detail.linkedPurchase')}</span>
                      <span className="font-mono">{viewing.purchaseOrder.orderNumber} ({formatCurrency(viewing.purchaseOrder.total)})</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {viewing.notes && (
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground mb-1">{t('detail.notes')}</p>
                  <p className="text-sm">{viewing.notes}</p>
                </div>
              )}

              {/* Timeline */}
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-3">{t('detail.timeline')}</p>
                {viewing.statusHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('detail.noHistory')}</p>
                ) : (
                  <div className="space-y-3">
                    {viewing.statusHistory.map((h, i) => (
                      <div key={h.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`h-3 w-3 rounded-full ${
                            i === viewing.statusHistory.length - 1 ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`} />
                          {i < viewing.statusHistory.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="pb-3 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={STATUS_VARIANTS[h.newStatus] || 'default'} className="text-xs">
                              {h.previousStatus ? `${t(`statuses.${h.previousStatus}` as any)} → ` : ''}{t(`statuses.${h.newStatus}` as any)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{h.changer.name}</p>
                          {h.notes && <p className="text-xs mt-1">{h.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 border-t pt-3">
                {!['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'].includes(viewing.status) && (
                  <Button variant="outline" onClick={() => openStatusChange(viewing)}>
                    {t('statusChange.title')}
                  </Button>
                )}
                {!['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'].includes(viewing.status) && (
                  <Button variant="outline" onClick={() => { setViewing(null); openEdit(viewing) }}>
                    {tc('actions.edit')}
                  </Button>
                )}
                {!['CLEARED'].includes(viewing.status) && (
                  <Button variant="outline" size="icon" className="text-destructive hover:text-destructive ml-auto" onClick={() => setDeleteConfirm(viewing.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={open => !open && setStatusDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('statusChange.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>{t('statusChange.newStatus')} *</Label>
              <Select value={statusForm.status} onValueChange={v => setStatusForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue placeholder={t('statusChange.newStatus')} /></SelectTrigger>
                <SelectContent>
                  {viewing && (VALID_TRANSITIONS[viewing.status] || []).map(s => (
                    <SelectItem key={s} value={s}>{t(`statuses.${s}` as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('statusChange.reason')}</Label>
              <Textarea
                value={statusForm.notes}
                onChange={e => setStatusForm(p => ({ ...p, notes: e.target.value }))}
                placeholder={t('statusChange.reasonPlaceholder')}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>{t('form.cancel')}</Button>
              <Button onClick={handleStatusChange} disabled={!statusForm.status || statusMutation.isPending}>
                {t('statusChange.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tc('actions.delete')}?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('form.cancel')}</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? tc('common.saving') : tc('actions.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['DEPOSITED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'RETURNED', 'CANCELLED'],
  DEPOSITED: ['PRESENTED', 'CLEARED', 'BOUNCED', 'RETURNED'],
  PRESENTED: ['CLEARED', 'BOUNCED', 'RETURNED'],
  CLEARED: [],
  BOUNCED: [],
  RETURNED: [],
  CANCELLED: [],
}
