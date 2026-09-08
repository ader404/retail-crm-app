'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Plus, Search, Pencil, Trash2, Receipt, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface User { id: string; name: string }
interface Expense {
  id: string; category: string; amount: number; description?: string; date: string
  user: User
}

const CATEGORIES = ['RENT','SALARIES','ELECTRICITY','INTERNET','TRANSPORTATION','MARKETING','REPAIRS','MISCELLANEOUS']
const CATEGORY_COLORS: Record<string, string> = {
  RENT: 'bg-blue-500/10 text-blue-600',
  SALARIES: 'bg-purple-500/10 text-purple-600',
  ELECTRICITY: 'bg-yellow-500/10 text-yellow-700',
  INTERNET: 'bg-cyan-500/10 text-cyan-600',
  TRANSPORTATION: 'bg-orange-500/10 text-orange-600',
  MARKETING: 'bg-pink-500/10 text-pink-600',
  REPAIRS: 'bg-red-500/10 text-red-600',
  MISCELLANEOUS: 'bg-zinc-500/10 text-zinc-600',
}

const defaultForm = { userId: '', category: '', amount: '', description: '', date: '' }

export default function ExpensesPage() {
  const t = useTranslations('expenses')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState(defaultForm)

  const { data: expensesData, isLoading } = useQuery<any>({
    queryKey: ['expenses-all', page, limit, search, filterCategory],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(filterCategory !== 'ALL' && { category: filterCategory }),
      })
      return api.get(`/expenses?${params}`).then(r => r.data)
    },
  })
  const expenses = expensesData?.data || []
  const meta = expensesData?.meta || { total: 0, page: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }

  const { data: usersData } = useQuery<any>({
    queryKey: ['users-all'],
    queryFn: () => api.get('/users?limit=100').then(r => r.data),
  })
  const users = usersData || []

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/expenses', { ...data, amount: +data.amount, date: data.date || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast.success(t('toast.added')); closeDialog() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toast.failed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) =>
      api.patch(`/expenses/${id}`, { ...data, amount: data.amount ? +data.amount : undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast.success(t('toast.updated')); closeDialog() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toast.failed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast.success(t('toast.deleted')) },
    onError: () => toast.error(t('toast.deleteFailed')),
  })

  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0)

  function openCreate() { setEditing(null); setForm(defaultForm); setDialogOpen(true) }
  function openEdit(e: Expense) {
    setEditing(e)
    setForm({ userId: e.user.id, category: e.category, amount: String(e.amount), description: e.description ?? '', date: e.date.slice(0, 10) })
    setDialogOpen(true)
  }
  function closeDialog() { setDialogOpen(false); setEditing(null); setForm(defaultForm) }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.category || !form.amount || !form.userId) return toast.error(t('toast.validationError'))
    if (editing) updateMutation.mutate({ id: editing.id, data: form })
    else createMutation.mutate(form)
  }

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('title')} />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('searchPlaceholder')} className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder={t('categoryPlaceholder')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('allCategories')}</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{t(`categories.${c}` as any)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t('total')}: <span className="font-semibold text-foreground">{formatCurrency(totalExpenses)}</span></span>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />{t('addExpense')}</Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.date')}</TableHead>
                <TableHead>{t('table.category')}</TableHead>
                <TableHead>{t('table.description')}</TableHead>
                <TableHead>{t('table.addedBy')}</TableHead>
                <TableHead className="text-end">{t('table.amount')}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">{t('loading')}</TableCell></TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-1"><Receipt className="h-5 w-5 opacity-40" /><span>{t('noExpenses')}</span></div>
                  </TableCell>
                </TableRow>
              ) : expenses.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground text-sm">{new Date(e.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[e.category] ?? ''}`}>
                      {t(`categories.${e.category}` as any)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{e.description ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.user.name}</TableCell>
                  <TableCell className="text-end font-semibold">{formatCurrency(Number(e.amount))}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(e.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between">
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? t('dialog.editTitle') : t('dialog.addTitle')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('dialog.category')}</Label>
                <Select value={form.category} onValueChange={v => f('category', v)}>
                  <SelectTrigger><SelectValue placeholder={t('dialog.selectCategory')} /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{t(`categories.${c}` as any)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('dialog.addedBy')}</Label>
                <Select value={form.userId} onValueChange={v => f('userId', v)}>
                  <SelectTrigger><SelectValue placeholder={t('dialog.selectUser')} /></SelectTrigger>
                  <SelectContent>{users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('dialog.amount')}</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => f('amount', e.target.value)} placeholder="0.00" required />
              </div>
              <div className="space-y-1.5">
                <Label>{t('dialog.date')}</Label>
                <Input type="date" value={form.date} onChange={e => f('date', e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5"><Label>{t('dialog.description')}</Label><Input value={form.description} onChange={e => f('description', e.target.value)} placeholder={t('dialog.descriptionPlaceholder')} /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeDialog}>{t('dialog.cancel')}</Button>
              <Button type="submit" disabled={isPending}>{isPending ? t('dialog.saving') : t('dialog.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
