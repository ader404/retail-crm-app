'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Plus, Search, Pencil, UserX, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageAccessToggles } from '@/components/employees/page-access-toggles'
import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface User {
  id: string
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTANT'
  phone?: string
  isActive: boolean
  pageAccess?: string | null
}

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'warning'> = {
  OWNER: 'default',
  MANAGER: 'warning',
  CASHIER: 'secondary',
  ADMIN: 'default',
  SUPER_ADMIN: 'default',
  SALES: 'secondary',
  WAREHOUSE: 'secondary',
  ACCOUNTANT: 'secondary',
}

const defaultForm = { name: '', email: '', password: '', role: 'CASHIER', phone: '' }

function parsePageAccess(pageAccess: string | null | undefined): string[] {
  if (!pageAccess) return []
  try {
    const parsed = JSON.parse(pageAccess)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function EmployeesPage() {
  const t = useTranslations('employees')
  const tc = useTranslations()
  const tp = useTranslations('pageAccess')
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [pageAccessValue, setPageAccessValue] = useState<string[]>([])
  const [formTab, setFormTab] = useState('basic')

  const isOwner = currentUser?.role === 'SUPER_ADMIN'

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form & { pageAccess?: string }) => api.post('/users', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success(t('list.toasts.created')); closeDialog() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('list.toasts.createFailed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form & { pageAccess?: string }> }) => api.patch(`/users/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success(t('list.toasts.updated')); closeDialog() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('list.toasts.updateFailed')),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/users/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: () => toast.error(t('list.toasts.statusFailed')),
  })

  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  )

  function openCreate() {
    setEditingUser(null)
    setForm(defaultForm)
    setPageAccessValue([])
    setFormTab('basic')
    setDialogOpen(true)
  }

  function openEdit(user: User) {
    setEditingUser(user)
    setForm({ name: user.name, email: user.email, password: '', role: user.role, phone: user.phone ?? '' })
    setPageAccessValue(parsePageAccess(user.pageAccess))
    setFormTab('basic')
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingUser(null)
    setForm(defaultForm)
    setPageAccessValue([])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pageAccessStr = JSON.stringify(pageAccessValue)

    if (editingUser) {
      const payload: Partial<typeof form & { pageAccess?: string }> = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone,
      }
      if (form.password) payload.password = form.password
      if (isOwner) payload.pageAccess = pageAccessStr
      updateMutation.mutate({ id: editingUser.id, data: payload })
    } else {
      createMutation.mutate({ ...form, pageAccess: pageAccessStr })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('list.title')} />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('list.searchPlaceholder')} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('list.addButton')}
          </Button>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('list.table.name')}</TableHead>
                <TableHead>{t('list.table.email')}</TableHead>
                <TableHead>{t('list.table.role')}</TableHead>
                <TableHead>{t('list.table.phone')}</TableHead>
                <TableHead>{t('list.table.status')}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">{t('list.loading')}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">{t('list.empty')}</TableCell></TableRow>
              ) : filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell><Badge variant={ROLE_VARIANTS[user.role]}>{t(`list.roles.${user.role}`)}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{user.phone ?? '—'}</TableCell>
                  <TableCell><Badge variant={user.isActive ? 'success' : 'secondary'}>{user.isActive ? t('list.status.active') : t('list.status.inactive')}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleMutation.mutate({ id: user.id, isActive: !user.isActive })}>
                        {user.isActive ? <UserX className="h-3.5 w-3.5 text-destructive" /> : <UserCheck className="h-3.5 w-3.5 text-emerald-500" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? t('list.dialog.editTitle') : t('list.dialog.addTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs value={formTab} onValueChange={setFormTab}>
              <TabsList className="w-full">
                <TabsTrigger value="basic" className="flex-1">{t('list.dialog.tabs.basic')}</TabsTrigger>
                <TabsTrigger value="pageAccess" className="flex-1">{tp('title')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t('list.dialog.fields.fullName')}</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{tc('common.email')}</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{editingUser ? t('list.dialog.fields.newPassword') : t('list.dialog.fields.password')}</Label>
                  <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingUser} minLength={8} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('list.dialog.fields.role')}</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUPER_ADMIN">{t('list.roles.SUPER_ADMIN')}</SelectItem>
                        <SelectItem value="ADMIN">{t('list.roles.ADMIN')}</SelectItem>
                        <SelectItem value="MANAGER">{t('list.roles.MANAGER')}</SelectItem>
                        <SelectItem value="CASHIER">{t('list.roles.CASHIER')}</SelectItem>
                        <SelectItem value="SALES">{t('list.roles.SALES')}</SelectItem>
                        <SelectItem value="WAREHOUSE">{t('list.roles.WAREHOUSE')}</SelectItem>
                        <SelectItem value="ACCOUNTANT">{t('list.roles.ACCOUNTANT')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{tc('common.phone')}</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </TabsContent>

              <TabsContent value="pageAccess" className="mt-4">
                {isOwner ? (
                  <PageAccessToggles value={pageAccessValue} onChange={setPageAccessValue} />
                ) : (
                  <p className="text-sm text-muted-foreground py-4">{tp('ownerOnly')}</p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
              <Button type="button" variant="outline" onClick={closeDialog}>{tc('actions.cancel')}</Button>
              <Button type="submit" disabled={isPending}>{isPending ? t('list.dialog.saving') : tc('actions.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
