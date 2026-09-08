'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export interface ExportConfig {
  language: 'en' | 'fr' | 'ar'
  columns: string[]
  format: 'pdf' | 'print'
}

interface Column {
  key: string
  label: string
  default?: boolean
}

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  columns: Column[]
  data: any[]
  filename: string
  filters?: Record<string, string>
  onExportPDF: (config: ExportConfig) => void
  onPrint: (config: ExportConfig) => void
}

export function ExportDialog({
  open,
  onOpenChange,
  title,
  columns,
  data,
  filename,
  filters,
  onExportPDF,
  onPrint,
}: ExportDialogProps) {
  const t = useTranslations('export')

  const defaultSelectedColumns = columns
    .filter((col) => col.default !== false)
    .map((col) => col.key)

  const [language, setLanguage] = useState<'en' | 'fr' | 'ar'>('en')
  const [format, setFormat] = useState<'pdf' | 'print'>('pdf')
  const [selectedColumns, setSelectedColumns] = useState<string[]>(defaultSelectedColumns)

  useEffect(() => {
    if (open) {
      setSelectedColumns(defaultSelectedColumns)
    }
  }, [open, columns])

  const handleColumnToggle = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const handleSelectAll = () => {
    setSelectedColumns(columns.map((col) => col.key))
  }

  const handleClearAll = () => {
    setSelectedColumns([])
  }

  const handleRestoreDefault = () => {
    setSelectedColumns(defaultSelectedColumns)
  }

  const handleExport = () => {
    const config: ExportConfig = { language, columns: selectedColumns, format }
    if (format === 'pdf') {
      onExportPDF(config)
    } else {
      onPrint(config)
    }
    onOpenChange(false)
  }

  const hasFilters = filters && Object.keys(filters).length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('language')}</Label>
            <RadioGroup
              value={language}
              onValueChange={(v) => setLanguage(v as 'en' | 'fr' | 'ar')}
              className="flex flex-row gap-4"
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="ar" id="lang-ar" />
                <Label htmlFor="lang-ar" className="cursor-pointer font-normal">
                  {t('arabic')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="fr" id="lang-fr" />
                <Label htmlFor="lang-fr" className="cursor-pointer font-normal">
                  {t('french')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="en" id="lang-en" />
                <Label htmlFor="lang-en" className="cursor-pointer font-normal">
                  {t('english')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('format')}</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as 'pdf' | 'print')}
              className="flex flex-row gap-4"
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="pdf" id="fmt-pdf" />
                <Label htmlFor="fmt-pdf" className="cursor-pointer font-normal">
                  PDF
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="print" id="fmt-print" />
                <Label htmlFor="fmt-print" className="cursor-pointer font-normal">
                  {t('print')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('columns')}</Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleSelectAll} type="button">
                  {t('selectAll')}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAll} type="button">
                  {t('clearAll')}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRestoreDefault} type="button">
                  {t('restoreDefault')}
                </Button>
              </div>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              {columns.map((col) => (
                <div key={col.key} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={`col-${col.key}`}
                    checked={selectedColumns.includes(col.key)}
                    onCheckedChange={() => handleColumnToggle(col.key)}
                  />
                  <Label htmlFor={`col-${col.key}`} className="cursor-pointer font-normal">
                    {col.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {hasFilters && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('activeFilters')}</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {key}: {value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFormat('print')
              const config: ExportConfig = {
                language,
                columns: selectedColumns,
                format: 'print',
              }
              onPrint(config)
              onOpenChange(false)
            }}
            disabled={selectedColumns.length === 0}
          >
            {t('print')}
          </Button>
          <Button onClick={handleExport} disabled={selectedColumns.length === 0}>
            {t('exportPDF')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
