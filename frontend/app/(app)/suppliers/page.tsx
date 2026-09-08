'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Plus, Search, Pencil, Trash2, Eye, Truck } from 'lucide-react'
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
import { useSuppliers } from '@/hooks/use-api'
import { useDebounce } from '@/hooks/use-debounce'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface Product { id: string; name: string; sku: string; sellingPrice: number; isActive: boolean }
interface Supplier {
  id: string; companyName: string; contactPerson?: string; phone?: string; email?: string; address?: string
  _count?: { products: number; purchaseOrders: number }
  products?: Product[]
}

const defaultForm = { companyName: '', contactPerson: '', phone: '', email: '', address: '' }

export default function SuppliersPage() {
  const router = useRouter()
  const t = useTranslations('suppliers')
  const tc = useTranslations()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(defaultForm)

  const { data, isLoading, isFetching } = useSuppliers(page, limit, debouncedSearch)

  const suppliers = useMemo(() => data?.data || [], [data])
  const meta = useMemo(() => data?.meta, [data])

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/suppliers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); toast.success(t('list.toasts.created')); closeDialog() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('list.toasts.failed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) => api.patch(`/suppliers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); toast.success(t('list.toasts.updated')); closeDialog() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('list.toasts.failed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); toast.success(t('list.toasts.deleted')) },
    onError: () => toast.error(t('list.toasts.deleteError')),
  })

  function openCreate() { setEditing(null); setForm(defaultForm); setDialogOpen(true) }
  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({ companyName: s.companyName, contactPerson: s.contactPerson ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '' })
    setDialogOpen(true)
  }
  function closeDialog() { setDialogOpen(false); setEditing(null); setForm(defaultForm) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form, contactPerson: form.contactPerson || undefined, phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined }
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
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />{t('list.addButton')}</Button>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('list.table.company')}</TableHead>
                <TableHead>{t('list.table.contactPerson')}</TableHead>
                <TableHead>{tc('common.phone')}</TableHead>
                <TableHead>{tc('common.email')}</TableHead>
                <TableHead>{t('list.table.products')}</TableHead>
                <TableHead>{t('list.table.orders')}</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7}><TableSkeleton rows={5} columns={7} /></TableCell></TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-1"><Truck className="h-5 w-5 opacity-40" /><span>{t('list.empty')}</span></div>
                  </TableCell>
                </TableRow>
              ) : suppliers.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.companyName}</TableCell>
                  <TableCell className="text-muted-foreground">{s.contactPerson ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email ?? '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{s._count?.products ?? 0}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{s._count?.purchaseOrders ?? 0}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/suppliers/${s.id}`)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
              showing={suppliers.length}
            />
          )}
        </div>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? t('list.dialog.editTitle') : t('list.dialog.addTitle')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label>{t('list.dialog.fields.companyName')}</Label><Input value={form.companyName} onChange={e => f('companyName', e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{t('list.dialog.fields.contactPerson')}</Label><Input value={form.contactPerson} onChange={e => f('contactPerson', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>{tc('common.phone')}</Label><Input value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>{tc('common.email')}</Label><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{tc('common.address')}</Label><Input value={form.address} onChange={e => f('address', e.target.value)} /></div>
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
