'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Image as ImageIcon, Languages } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useLocale } from '@/components/providers/locale-provider'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import api from '@/lib/api'
import { resolveImageUrl } from '@/lib/utils'

interface Settings {
  id: string
  companyName: string
  logoUrl?: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
  currency: string
  receiptFooter: string
  showLogoOnReceipt: boolean
  receiptLocale: string
  showPhoneOnReceipt: boolean
  showEmailOnReceipt: boolean
  showAddressOnReceipt: boolean
  showTaxIdOnReceipt: boolean
}

const defaultSettingsForm = {
  companyName: '', logoUrl: '', address: '', phone: '', email: '', taxId: '', currency: 'USD', receiptFooter: '', showLogoOnReceipt: true, receiptLocale: 'en', showPhoneOnReceipt: true, showEmailOnReceipt: true, showAddressOnReceipt: true, showTaxIdOnReceipt: true,
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const { locale, setLocale } = useLocale()
  const queryClient = useQueryClient()

  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  })
  const [settingsForm, setSettingsForm] = useState(defaultSettingsForm)
  const [logoUploading, setLogoUploading] = useState(false)

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        companyName: settings.companyName ?? '',
        logoUrl: settings.logoUrl ?? '',
        address: settings.address ?? '',
        phone: settings.phone ?? '',
        email: settings.email ?? '',
        taxId: settings.taxId ?? '',
        currency: settings.currency ?? 'USD',
        receiptFooter: settings.receiptFooter ?? '',
        showLogoOnReceipt: settings.showLogoOnReceipt ?? true,
        receiptLocale: settings.receiptLocale ?? 'en',
        showPhoneOnReceipt: settings.showPhoneOnReceipt ?? true,
        showEmailOnReceipt: settings.showEmailOnReceipt ?? true,
        showAddressOnReceipt: settings.showAddressOnReceipt ?? true,
        showTaxIdOnReceipt: settings.showTaxIdOnReceipt ?? true,
      })
    }
  }, [settings])

  const updateSettingsMutation = useMutation({
    mutationFn: (data: typeof defaultSettingsForm) => api.patch('/settings', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success(t('toasts.settingsSaved')) },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t('toasts.settingsFailed')),
  })

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post('/settings/upload-logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data as { url: string })
    },
    onMutate: () => setLogoUploading(true),
    onSuccess: (data) => setSettingsForm((prev) => ({ ...prev, logoUrl: data.url })),
    onError: (e: any) => toast.error(e?.message ?? t('toasts.logoUploadFailed')),
    onSettled: () => setLogoUploading(false),
  })

  const sf = (k: keyof typeof settingsForm, v: any) => setSettingsForm((prev) => ({ ...prev, [k]: v }))
  function handleSettingsSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateSettingsMutation.mutate(settingsForm)
  }

  async function handleLanguageChange(newLocale: 'en' | 'fr' | 'ar') {
    try {
      await setLocale(newLocale)
      toast.success(t('toasts.languageUpdated'))
    } catch (error) {
      toast.error(t('toasts.languageUpdateFailed'))
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('title')} />
      <div className="flex-1 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="space-y-4">
          <div className="text-center">
            <h2 className="text-sm font-semibold flex items-center justify-center gap-2"><Building2 className="h-4 w-4" />{t('company.title')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t('company.description')}</p>
          </div>

          {settingsLoading ? (
            <div className="text-sm text-muted-foreground text-center">{t('loading')}</div>
          ) : (
            <form onSubmit={handleSettingsSubmit} className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {settingsForm.logoUrl ? (
                  <div className="relative h-32 w-32 rounded-lg border-2 border-border bg-white overflow-hidden flex items-center justify-center p-2">
                    <img
                      src={resolveImageUrl(settingsForm.logoUrl)}
                      alt="Company logo"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-32 w-32 rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-2 w-full">
                  <Label>{t('company.logo')}</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={logoUploading}
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadLogoMutation.mutate(file) }}
                  />
                  {logoUploading && <p className="text-xs text-muted-foreground">{t('company.uploading')}</p>}
                  <p className="text-xs text-muted-foreground">Recommended: Square image (e.g., 512x512px) for best results</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t('company.companyName')}</Label><Input value={settingsForm.companyName} onChange={(e) => sf('companyName', e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>{t('company.currency')}</Label><Input value={settingsForm.currency} onChange={(e) => sf('currency', e.target.value)} placeholder={t('company.currencyPlaceholder')} /></div>
                <div className="col-span-2 space-y-1.5"><Label>{t('company.address')}</Label><Input value={settingsForm.address} onChange={(e) => sf('address', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>{t('company.phone')}</Label><Input value={settingsForm.phone} onChange={(e) => sf('phone', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>{t('company.email')}</Label><Input value={settingsForm.email} onChange={(e) => sf('email', e.target.value)} /></div>
                <div className="col-span-2 space-y-1.5"><Label>{t('company.taxId')}</Label><Input value={settingsForm.taxId} onChange={(e) => sf('taxId', e.target.value)} /></div>
                <div className="col-span-2 space-y-1.5">
                  <Label>{t('company.receiptFooter')}</Label>
                  <Textarea value={settingsForm.receiptFooter} onChange={(e) => sf('receiptFooter', e.target.value)} placeholder={t('company.receiptFooterPlaceholder')} />
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label>{t('company.showLogoOnReceipt')}</Label>
                    <p className="text-xs text-muted-foreground">{t('company.showLogoOnReceiptDescription')}</p>
                  </div>
                  <Switch checked={settingsForm.showLogoOnReceipt} onCheckedChange={(v) => sf('showLogoOnReceipt', v)} />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>{t('company.receiptLanguage')}</Label>
                  <Select value={settingsForm.receiptLocale} onValueChange={(v) => sf('receiptLocale', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-3">
                  <Label className="text-sm font-semibold">{t('company.receiptElements')}</Label>

                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label className="text-sm font-normal cursor-pointer">{t('company.showPhoneOnReceipt')}</Label>
                    <Switch checked={settingsForm.showPhoneOnReceipt} onCheckedChange={(v) => sf('showPhoneOnReceipt', v)} />
                  </div>

                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label className="text-sm font-normal cursor-pointer">{t('company.showEmailOnReceipt')}</Label>
                    <Switch checked={settingsForm.showEmailOnReceipt} onCheckedChange={(v) => sf('showEmailOnReceipt', v)} />
                  </div>

                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label className="text-sm font-normal cursor-pointer">{t('company.showAddressOnReceipt')}</Label>
                    <Switch checked={settingsForm.showAddressOnReceipt} onCheckedChange={(v) => sf('showAddressOnReceipt', v)} />
                  </div>

                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label className="text-sm font-normal cursor-pointer">{t('company.showTaxIdOnReceipt')}</Label>
                    <Switch checked={settingsForm.showTaxIdOnReceipt} onCheckedChange={(v) => sf('showTaxIdOnReceipt', v)} />
                  </div>
                </div>
              </div>

              <div className="flex justify-center sm:justify-end">
                <Button type="submit" disabled={updateSettingsMutation.isPending}>{updateSettingsMutation.isPending ? t('saving') : t('company.saveButton')}</Button>
              </div>
            </form>
          )}
        </section>

        <section className="space-y-4">
          <div className="text-center">
            <h2 className="text-sm font-semibold flex items-center justify-center gap-2"><Languages className="h-4 w-4" />{t('language.title')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t('language.description')}</p>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="space-y-1.5 mx-auto max-w-sm">
              <Label>{t('language.selectLanguage')}</Label>
              <Select value={locale} onValueChange={handleLanguageChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('languages.en')}</SelectItem>
                  <SelectItem value="fr">{t('languages.fr')}</SelectItem>
                  <SelectItem value="ar">{t('languages.ar')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>
      </div>
      </div>
    </div>
  )
}
