'use client'

import { useTranslations } from 'next-intl'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

export interface PageAccessModule {
  key: string
  group: string
}

export const ALL_PAGE_ACCESS_MODULES: PageAccessModule[] = [
  { key: 'dashboard', group: 'main' },
  { key: 'notifications', group: 'main' },
  { key: 'pos', group: 'sales' },
  { key: 'sales', group: 'sales' },
  { key: 'customers', group: 'sales' },
  { key: 'loans', group: 'sales' },
  { key: 'products', group: 'inventory' },
  { key: 'categories', group: 'inventory' },
  { key: 'suppliers', group: 'inventory' },
  { key: 'expenses', group: 'finance' },
  { key: 'cheques', group: 'finance' },
  { key: 'reports', group: 'finance' },
  { key: 'employees', group: 'admin' },
  { key: 'settings', group: 'admin' },
]

export const MODULE_GROUP_KEYS = ['main', 'sales', 'inventory', 'finance', 'admin'] as const

interface PageAccessTogglesProps {
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

export function PageAccessToggles({ value, onChange, disabled = false }: PageAccessTogglesProps) {
  const t = useTranslations('pageAccess')

  function toggleModule(moduleKey: string) {
    if (disabled) return
    if (value.includes(moduleKey)) {
      onChange(value.filter((k) => k !== moduleKey))
    } else {
      onChange([...value, moduleKey])
    }
  }

  function selectAll() {
    if (disabled) return
    onChange(ALL_PAGE_ACCESS_MODULES.map((m) => m.key))
  }

  function clearAll() {
    if (disabled) return
    onChange([])
  }

  function applyPreset(modules: string[]) {
    if (disabled) return
    onChange(modules)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">{t('title')}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{t('description')}</p>
        </div>
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={disabled}>
            {t('selectAll')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clearAll} disabled={disabled}>
            {t('clearAll')}
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(['dashboard', 'pos', 'customers', 'products'])} disabled={disabled}>
          {t('presets.cashier')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(['dashboard', 'pos', 'sales', 'customers', 'products'])} disabled={disabled}>
          {t('presets.sales')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(['dashboard', 'products', 'categories', 'suppliers'])} disabled={disabled}>
          {t('presets.inventory')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(['dashboard', 'expenses', 'cheques', 'reports'])} disabled={disabled}>
          {t('presets.accountant')}
        </Button>
      </div>

      <div className="space-y-3 border rounded-lg p-4">
        {MODULE_GROUP_KEYS.map((groupKey) => {
          const modules = ALL_PAGE_ACCESS_MODULES.filter((m) => m.group === groupKey)
          const allEnabled = modules.every((m) => value.includes(m.key))
          const someEnabled = modules.some((m) => value.includes(m.key))

          return (
            <div key={groupKey}>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t(`groups.${groupKey}`)}
                </h5>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    if (disabled) return
                    if (allEnabled) {
                      onChange(value.filter((k) => !modules.some((m) => m.key === k)))
                    } else {
                      onChange([...new Set([...value, ...modules.map((m) => m.key)])])
                    }
                  }}
                  disabled={disabled}
                >
                  {allEnabled ? t('deselectGroup') : t('selectGroup')}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {modules.map((mod) => (
                  <div key={mod.key} className="flex items-center justify-between">
                    <span className="text-sm">{t(`modules.${mod.key}`)}</span>
                    <Switch
                      checked={value.includes(mod.key)}
                      onCheckedChange={() => toggleModule(mod.key)}
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('selectedCount', { count: value.length })}
        </p>
      )}
    </div>
  )
}
