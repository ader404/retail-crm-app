'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import api from '@/lib/api'

interface Customer {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
}

export default function NewLoanPage() {
  const router = useRouter()
  const t = useTranslations('loans')
  const tc = useTranslations()
  const [loanType, setLoanType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER')
  const [form, setForm] = useState({
    customerId: '',
    supplierId: '',
    amount: '',
    dueDate: '',
    notes: '',
  })

  const { data: customersData, isLoading: isLoadingCustomers, error: customersError } = useQuery<any>({
    queryKey: ['customers-all'],
    queryFn: async () => {
      try {
        console.log('Fetching customers from:', `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api'}/customers`)
        const response = await api.get('/customers', { params: { limit: 100 } })
        console.log('Customers response:', response.data)
        return response.data
      } catch (error: any) {
        console.error('Customer fetch error:', error)
        console.error('Error details:', error.response?.data || error.message)
        throw error
      }
    },
    enabled: loanType === 'CUSTOMER',
  })
  const customers = customersData?.data || []

  const { data: suppliersData, isLoading: isLoadingSuppliers, error: suppliersError } = useQuery<any>({
    queryKey: ['suppliers-all'],
    queryFn: async () => {
      try {
        console.log('Fetching suppliers from:', `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api'}/suppliers`)
        const response = await api.get('/suppliers', { params: { limit: 100 } })
        console.log('Suppliers response:', response.data)
        return response.data
      } catch (error: any) {
        console.error('Supplier fetch error:', error)
        console.error('Error details:', error.response?.data || error.message)
        throw error
      }
    },
    enabled: loanType === 'SUPPLIER',
  })
  const suppliers = suppliersData?.data || []

  // Debug logging
  console.log('Loan type:', loanType)
  console.log('Customers data:', customersData)
  console.log('Customers array:', customers)
  console.log('Suppliers data:', suppliersData)
  console.log('Suppliers array:', suppliers)

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/loans', data),
    onSuccess: (response) => {
      toast.success(t('form.toasts.created'))
      router.push(`/loans/${response.data.id}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('form.toasts.createFailed')),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amount = Number(form.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('form.toasts.invalidAmount'))
      return
    }

    if (loanType === 'CUSTOMER' && !form.customerId) {
      toast.error(t('form.toasts.selectCustomer'))
      return
    }

    if (loanType === 'SUPPLIER' && !form.supplierId) {
      toast.error(t('form.toasts.selectSupplier'))
      return
    }

    const payload: any = {
      type: loanType === 'CUSTOMER' ? 'CUSTOMER_LOAN' : 'SUPPLIER_LOAN',
      principalAmount: amount,
      dueDate: form.dueDate || undefined,
      reason: form.notes || undefined,
    }

    if (loanType === 'CUSTOMER') {
      payload.customerId = form.customerId
    } else {
      payload.supplierId = form.supplierId
    }

    createMutation.mutate(payload)
  }

  function updateForm(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('form.pageTitle')} />
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{t('form.heading')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('form.subheading')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Loan Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>{t('form.loanTypeCard.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={loanType} onValueChange={(v) => setLoanType(v as 'CUSTOMER' | 'SUPPLIER')}>
                  <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
                    <RadioGroupItem value="CUSTOMER" id="customer" />
                    <Label htmlFor="customer" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">{t('form.loanTypeCard.customer.title')}</p>
                        <p className="text-sm text-muted-foreground">{t('form.loanTypeCard.customer.description')}</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent/50 cursor-pointer">
                    <RadioGroupItem value="SUPPLIER" id="supplier" />
                    <Label htmlFor="supplier" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">{t('form.loanTypeCard.supplier.title')}</p>
                        <p className="text-sm text-muted-foreground">{t('form.loanTypeCard.supplier.description')}</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Loan Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t('form.detailsCard.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer/Supplier Selection */}
                <div className="space-y-1.5">
                  <Label>
                    {loanType === 'CUSTOMER' ? t('form.detailsCard.selectCustomer') : t('form.detailsCard.selectSupplier')}
                  </Label>
                  {loanType === 'CUSTOMER' ? (
                    <>
                      <Select value={form.customerId} onValueChange={(v) => updateForm('customerId', v)} disabled={isLoadingCustomers}>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingCustomers ? t('form.detailsCard.loadingCustomers') : t('form.detailsCard.chooseCustomer')} />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              {isLoadingCustomers ? tc('common.loading') : t('form.detailsCard.noCustomersFound')}
                            </div>
                          ) : (
                            customers.map((customer: any) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {customersError && (
                        <p className="text-xs text-destructive">{t('form.detailsCard.failedLoadCustomers')}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <Select value={form.supplierId} onValueChange={(v) => updateForm('supplierId', v)} disabled={isLoadingSuppliers}>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingSuppliers ? t('form.detailsCard.loadingSuppliers') : t('form.detailsCard.chooseSupplier')} />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              {isLoadingSuppliers ? tc('common.loading') : t('form.detailsCard.noSuppliersFound')}
                            </div>
                          ) : (
                            suppliers.map((supplier: any) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {suppliersError && (
                        <p className="text-xs text-destructive">{t('form.detailsCard.failedLoadSuppliers')}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Loan Amount */}
                <div className="space-y-1.5">
                  <Label>{t('form.detailsCard.loanAmount')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => updateForm('amount', e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {loanType === 'CUSTOMER'
                      ? t('form.detailsCard.amountHelperCustomer')
                      : t('form.detailsCard.amountHelperSupplier')}
                  </p>
                </div>

                {/* Due Date */}
                <div className="space-y-1.5">
                  <Label>{t('form.detailsCard.dueDate')}</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={e => updateForm('dueDate', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('form.detailsCard.dueDateHelper')}
                  </p>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label>{t('form.detailsCard.notes')}</Label>
                  <Textarea
                    placeholder={t('form.detailsCard.notesPlaceholder')}
                    value={form.notes}
                    onChange={e => updateForm('notes', e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t('form.summaryCard.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('form.summaryCard.type')}</span>
                  <span className="font-medium">
                    {loanType === 'CUSTOMER' ? t('form.loanTypeCard.customer.title') : t('form.loanTypeCard.supplier.title')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {loanType === 'CUSTOMER' ? t('form.summaryCard.customerLabel') : t('form.summaryCard.supplierLabel')}
                  </span>
                  <span className="font-medium">
                    {loanType === 'CUSTOMER'
                      ? customers.find((c: any) => c.id === form.customerId)?.name || t('form.summaryCard.notSelected')
                      : suppliers.find((s: any) => s.id === form.supplierId)?.name || t('form.summaryCard.notSelected')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('form.summaryCard.amount')}</span>
                  <span className="font-bold text-lg">
                    ${form.amount || '0.00'}
                  </span>
                </div>
                {form.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('form.summaryCard.dueDate')}</span>
                    <span className="font-medium">{form.dueDate}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {tc('actions.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('form.creating') : t('form.submit')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
