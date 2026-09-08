'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Plus, Search, Pencil, Trash2, Eye, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/ui/skeletons'
import { useCustomers } from '@/hooks/use-api'
import { useDebounce } from '@/hooks/use-debounce'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Sale { id: string; invoiceNumber: string; total: number; status: string; createdAt: string }
interface Customer {
  id: string; name: string; phone?: string; email?: string; address?: string; notes?: string
  credit: number; debt: number; createdAt: string
  _count?: { sales: number }
  sales?: Sale[]
}

const defaultForm = { name: '', phone: '', email: '', address: '', notes: '' }

export default function CustomersPage() {
  const router = useRouter()
  const t = useTranslations('customers')
  const tc = useTranslations()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewing, setViewing] = useState<Customer | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(defaultForm)

  const { data, isLoading, isFetching } = useCustomers(page, limit, debouncedSearch)

  const customers = useMemo(() => data?.data || [], [data])
  const meta = useMemo(() => data?.meta, [data])

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/customers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success(t('list.toasts.created')); closeDialog() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('list.toasts.saveFailed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) => api.patch(`/customers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success(t('list.toasts.updated')); closeDialog() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('list.toasts.saveFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success(t('list.toasts.deleted')) },
    onError: () => toast.error(t('list.toasts.deleteFailed')),
  })

  function openCreate() { setEditing(null); setForm(defaultForm); setDialogOpen(true) }
  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', notes: c.notes ?? '' })
    setDialogOpen(true)
  }
  function closeDialog() { setDialogOpen(false); setEditing(null); setForm(defaultForm) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form, phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined, notes: form.notes || undefined }
    if (editing) { updateMutation.mutate({ id: editing.id, data: payload }) }
    else { createMutation.mutate(form) }
  }

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('list.title')} />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('list.searchPlaceholder')}
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />{t('list.addCustomer')}</Button>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('list.table.name')}</TableHead>
                <TableHead>{t('list.table.phone')}</TableHead>
                <TableHead>{t('list.table.email')}</TableHead>
                <TableHead>{t('list.table.sales')}</TableHead>
                <TableHead>{t('list.table.credit')}</TableHead>
                <TableHead>{t('list.table.debt')}</TableHead>
                <TableHead>{t('list.table.since')}</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8}><TableSkeleton rows={5} columns={8} /></TableCell></TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-1"><Users className="h-5 w-5 opacity-40" /><span>{t('list.empty')}</span></div>
                  </TableCell>
                </TableRow>
              ) : customers.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{c._count?.sales ?? 0}</Badge></TableCell>
                  <TableCell className="text-emerald-500 font-medium">{Number(c.credit) > 0 ? formatCurrency(c.credit) : '—'}</TableCell>
                  <TableCell className="text-destructive font-medium">{Number(c.debt) > 0 ? formatCurrency(c.debt) : '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDate(c.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/customers/${c.id}`)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {meta && meta.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
              total={meta.total}
              showing={customers.length}
            />
          )}
        </div>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? t('list.dialog.editTitle') : t('list.dialog.addTitle')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label>{t('list.dialog.fields.name')}</Label><Input value={form.name} onChange={e => f('name', e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{t('list.dialog.fields.phone')}</Label><Input value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>{t('list.dialog.fields.email')}</Label><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>{t('list.dialog.fields.address')}</Label><Input value={form.address} onChange={e => f('address', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('list.dialog.fields.notes')}</Label><Input value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeDialog}>{tc('actions.cancel')}</Button>
              <Button type="submit" disabled={isPending}>{isPending ? t('list.dialog.saving') : tc('actions.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
