'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Download, Calendar, FileText, Printer } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportTableToCSV, formatCurrencyForExport, formatDateForExport } from '@/lib/export'

interface LedgerEntry {
  date: string
  type: string
  description: string
  reference: string
  debit: number
  credit: number
  balance: number
}

interface CustomerLedger {
  customer: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  entries: LedgerEntry[]
  openingBalance: number
  closingBalance: number
}

export default function CustomerLedgerPage({ params }: { params: { id: string } }) {
  const t = useTranslations('customers')
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)

  const { data: ledger, isLoading } = useQuery<CustomerLedger>({
    queryKey: ['customer-ledger', params.id, startDate, endDate],
    queryFn: () => api.get(`/customers/${params.id}/ledger`, {
      params: { startDate, endDate }
    }).then(r => r.data),
  })

  function handlePrint() {
    window.print()
  }

  function handleExportCSV() {
    if (!ledger) return

    const exportData = ledger.entries.map(entry => ({
      Date: formatDateForExport(entry.date),
      Type: entry.type,
      Description: entry.description,
      Reference: entry.reference,
      Debit: formatCurrencyForExport(entry.debit),
      Credit: formatCurrencyForExport(entry.credit),
      Balance: formatCurrencyForExport(entry.balance),
    }))

    const columns = [
      { key: 'Date', label: t('ledger.table.date') },
      { key: 'Type', label: t('ledger.table.type') },
      { key: 'Description', label: t('ledger.table.description') },
      { key: 'Reference', label: t('ledger.table.reference') },
      { key: 'Debit', label: t('ledger.table.debit') },
      { key: 'Credit', label: t('ledger.table.credit') },
      { key: 'Balance', label: t('ledger.table.balance') },
    ]

    exportTableToCSV(exportData, columns, `customer-ledger-${ledger.customer.name}-${new Date().toISOString().split('T')[0]}`)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Header title={t('ledger.header.title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('ledger.header.loading')}</p>
        </div>
      </div>
    )
  }

  if (!ledger) {
    return (
      <div className="flex flex-col flex-1">
        <Header title={t('ledger.header.title')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('ledger.header.notFound')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title={t('ledger.header.title')} />
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{ledger.customer.name}</h2>
              <p className="text-sm text-muted-foreground">{t('ledger.header.subtitle')}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                {t('ledger.header.export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="h-4 w-4 mr-2" />
                {t('ledger.header.exportCsv')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('ledger.header.printPdf')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Date Filter */}
        <Card className="print:hidden">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('ledger.dateFilter.startDate')}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('ledger.dateFilter.endDate')}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ledger Header (for print) */}
        <div className="hidden print:block space-y-2 mb-6">
          <h1 className="text-3xl font-bold">{t('ledger.print.title')}</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">{ledger.customer.name}</p>
              {ledger.customer.phone && <p>{t('ledger.print.phone', { phone: ledger.customer.phone })}</p>}
              {ledger.customer.email && <p>{t('ledger.print.email', { email: ledger.customer.email })}</p>}
            </div>
            <div className="text-right">
              <p>{t('ledger.print.period', { start: formatDate(startDate), end: formatDate(endDate) })}</p>
              <p>{t('ledger.print.generated', { date: formatDate(new Date().toISOString()) })}</p>
            </div>
          </div>
        </div>

        {/* Contact Info Card (screen only) */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>{t('ledger.info.title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t('ledger.info.phone')}</p>
              <p className="font-medium">{ledger.customer.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('ledger.info.email')}</p>
              <p className="font-medium">{ledger.customer.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('ledger.info.period')}</p>
              <p className="font-medium">{formatDate(startDate)} to {formatDate(endDate)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('ledger.balances.opening')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${ledger.openingBalance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {formatCurrency(Math.abs(ledger.openingBalance))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {ledger.openingBalance >= 0 ? t('ledger.balances.credit') : t('ledger.balances.debit')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('ledger.balances.closing')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${ledger.closingBalance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {formatCurrency(Math.abs(ledger.closingBalance))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {ledger.closingBalance >= 0 ? t('ledger.balances.credit') : t('ledger.balances.debit')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('ledger.balances.netChange')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(ledger.closingBalance - ledger.openingBalance) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {formatCurrency(Math.abs(ledger.closingBalance - ledger.openingBalance))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(ledger.closingBalance - ledger.openingBalance) >= 0 ? t('ledger.balances.increase') : t('ledger.balances.decrease')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ledger Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('ledger.table.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {ledger.entries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('ledger.table.empty')}</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('ledger.table.date')}</TableHead>
                      <TableHead>{t('ledger.table.type')}</TableHead>
                      <TableHead>{t('ledger.table.description')}</TableHead>
                      <TableHead>{t('ledger.table.reference')}</TableHead>
                      <TableHead className="text-end">{t('ledger.table.debit')}</TableHead>
                      <TableHead className="text-end">{t('ledger.table.credit')}</TableHead>
                      <TableHead className="text-end">{t('ledger.table.balance')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.entries.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium px-2 py-1 rounded bg-muted">
                            {entry.type}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                        <TableCell className="text-end font-medium text-destructive">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                        </TableCell>
                        <TableCell className="text-end font-medium text-emerald-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                        </TableCell>
                        <TableCell className={`text-end font-bold ${entry.balance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                          {formatCurrency(Math.abs(entry.balance))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Footer */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">{t('ledger.footer.totalTransactions')}</p>
                <p className="text-2xl font-bold">{ledger.entries.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('ledger.footer.outstandingBalance')}</p>
                <p className={`text-2xl font-bold ${ledger.closingBalance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {formatCurrency(Math.abs(ledger.closingBalance))}
                  <span className="text-sm ml-2 font-normal">
                    {ledger.closingBalance >= 0 ? `(${t('ledger.balances.credit')})` : `(${t('ledger.balances.debit')})`}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
