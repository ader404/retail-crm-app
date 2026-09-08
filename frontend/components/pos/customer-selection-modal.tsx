'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Search, X, Plus, User, Phone, Mail } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  debt: number
  credit: number
}

interface CustomerSelectionModalProps {
  open: boolean
  onClose: () => void
  onSelect: (customer: Customer | null) => void
  selectedCustomerId?: string | null
}

interface AddCustomerFormData {
  name: string
  phone: string
  email: string
  address: string
}

export function CustomerSelectionModal({ open, onClose, onSelect, selectedCustomerId }: CustomerSelectionModalProps) {
  const t = useTranslations('pos.customerModal')
  const tCommon = useTranslations('common')
  const tActions = useTranslations('actions')
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<AddCustomerFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
  })

  useEffect(() => {
    if (!open) {
      setSearch('')
      setPage(1)
      setShowAddForm(false)
      setFormData({ name: '', phone: '', email: '', address: '' })
    }
  }, [open])

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers-search', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
      })
      const res = await api.get(`/customers?${params}`)
      return res.data
    },
    enabled: open && !showAddForm,
  })

  const createCustomerMutation = useMutation({
    mutationFn: async (data: AddCustomerFormData) => {
      const res = await api.post('/customers', data)
      return res.data
    },
    onSuccess: (newCustomer) => {
      toast.success(t('customerCreated'))
      queryClient.invalidateQueries({ queryKey: ['customers-search'] })
      onSelect(newCustomer)
      onClose()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || t('customerCreateFailed')
      toast.error(message)
    },
  })

  const handleSelect = (customer: Customer) => {
    onSelect(customer)
    onClose()
  }

  const handleClear = () => {
    onSelect(null)
    onClose()
  }

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error(t('nameRequired'))
      return
    }
    createCustomerMutation.mutate(formData)
  }

  const customers = customersData?.data || []
  const meta = customersData?.meta

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-lg">{showAddForm ? t('addCustomer') : t('selectCustomer')}</DialogTitle>
        </DialogHeader>

        {!showAddForm ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search and Add Button */}
            <div className="px-5 pb-3 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9 h-10"
                />
              </div>
              <Button onClick={() => setShowAddForm(true)} variant="outline" className="shrink-0 h-10">
                <Plus className="h-4 w-4 mr-2" />
                {t('addCustomer')}
              </Button>
            </div>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto px-5 min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    {tCommon('loading')}
                  </div>
                </div>
              ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('noCustomers')}</p>
                </div>
              ) : (
                <div className="space-y-1.5 pb-2">
                  {customers.map((customer: Customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelect(customer)}
                      className={`w-full p-3 rounded-lg border text-start transition-all hover:bg-accent/50 ${
                        selectedCustomerId === customer.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-sm font-semibold text-primary">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{customer.name}</div>
                            <div className="flex items-center gap-3 mt-0.5">
                              {customer.phone && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{customer.phone}</span>
                                </span>
                              )}
                              {customer.email && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{customer.email}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={Number(customer.debt) > 0 ? 'destructive' : 'secondary'}
                          className="shrink-0 text-xs font-medium"
                        >
                          {formatCurrency(Number(customer.debt))}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta.hasPreviousPage}
                >
                  {tCommon('previous')}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {tCommon('pagination', { page: meta.page, totalPages: meta.totalPages, total: meta.total })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta.hasNextPage}
                >
                  {tCommon('next')}
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 px-5 py-3 border-t bg-muted/30">
              <Button variant="outline" onClick={handleClear} className="flex-1">
                {t('clearSelection')}
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">
                {tActions('cancel')}
              </Button>
            </div>
          </div>
        ) : (
          /* Add Customer Form */
          <form onSubmit={handleCreateCustomer} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">{t('customerName')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('customerNamePlaceholder')}
                  required
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-medium">{t('phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('phonePlaceholder')}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('emailPlaceholder')}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-sm font-medium">{t('address')}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('addressPlaceholder')}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex gap-2 px-5 py-3 border-t bg-muted/30">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="flex-1"
                disabled={createCustomerMutation.isPending}
              >
                {tActions('back')}
              </Button>
              <Button type="submit" className="flex-1" disabled={createCustomerMutation.isPending}>
                {createCustomerMutation.isPending ? tCommon('saving') : tActions('save')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
