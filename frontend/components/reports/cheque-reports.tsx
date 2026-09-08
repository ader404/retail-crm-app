'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { ArrowDownToLine, ArrowUpFromLine, Clock, AlertTriangle, CheckCircle, XCircle, Landmark } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportTableToCSV, formatCurrencyForExport, formatDateForExport } from '@/lib/export'

const PIE_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316','#64748b']

const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'warning' | 'secondary' | 'success'> = {
  PENDING: 'secondary',
  DEPOSITED: 'default',
  PRESENTED: 'default',
  CLEARED: 'success',
  BOUNCED: 'destructive',
  RETURNED: 'destructive',
  CANCELLED: 'destructive',
}

const today = new Date()
const currentYear = today.getFullYear()

type ChequeReportTab = 'overview' | 'statusDist' | 'monthly' | 'upcoming' | 'overdue' | 'byBank' | 'details'

interface ChequeReportsProps {
  dateFrom: string
  dateTo: string
}

export default function ChequeReports({ dateFrom, dateTo }: ChequeReportsProps) {
  const t = useTranslations('reports.cheques')
  const tc = useTranslations()
  const [subTab, setSubTab] = useState<ChequeReportTab>('overview')
  const [year, setYear] = useState(String(currentYear))
  const [filterType, setFilterType] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterBank, setFilterBank] = useState('')

  const params = () => {
    const endDate = new Date(dateTo)
    endDate.setDate(endDate.getDate() + 1)
    const adjusted = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    const p: Record<string, string> = { dateFrom, dateTo: adjusted }
    return p
  }

  const { data: summary } = useQuery({
    queryKey: ['cheque-report-summary', dateFrom, dateTo],
    queryFn: () => api.get('/reports/cheques/summary', { params: params() }).then(r => r.data),
    enabled: subTab === 'overview',
  })

  const { data: statusDist = [] } = useQuery<any[]>({
    queryKey: ['cheque-report-status', dateFrom, dateTo],
    queryFn: () => api.get('/reports/cheques/status-distribution', { params: params() }).then(r => r.data),
    enabled: subTab === 'statusDist',
  })

  const { data: monthly = [] } = useQuery<any[]>({
    queryKey: ['cheque-report-monthly', year],
    queryFn: () => api.get('/reports/cheques/monthly-activity', { params: { year } }).then(r => r.data),
    enabled: subTab === 'monthly',
  })

  const { data: upcoming } = useQuery({
    queryKey: ['cheque-report-upcoming'],
    queryFn: () => api.get('/reports/cheques/upcoming').then(r => r.data),
    enabled: subTab === 'upcoming',
  })

  const { data: overdueData } = useQuery({
    queryKey: ['cheque-report-overdue'],
    queryFn: () => api.get('/reports/cheques/overdue').then(r => r.data),
    enabled: subTab === 'overdue',
  })

  const { data: byBank = [] } = useQuery<any[]>({
    queryKey: ['cheque-report-bank', dateFrom, dateTo],
    queryFn: () => api.get('/reports/cheques/by-bank', { params: params() }).then(r => r.data),
    enabled: subTab === 'byBank',
  })

  const { data: details = [] } = useQuery<any[]>({
    queryKey: ['cheque-report-details', dateFrom, dateTo, filterType, filterStatus, filterBank],
    queryFn: () => {
      const p = { ...params() }
      if (filterType !== 'ALL') p.type = filterType
      if (filterStatus !== 'ALL') p.status = filterStatus
      if (filterBank) p.bankName = filterBank
      return api.get('/reports/cheques/details', { params: p }).then(r => r.data)
    },
    enabled: subTab === 'details',
  })

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const handleExportDetailsCSV = () => {
    const exportData = details.map((c: any) => ({
      'Cheque #': c.chequeNumber,
      Type: c.type,
      Party: c.partyName,
      Bank: c.bankName || '—',
      Amount: formatCurrencyForExport(c.amount),
      'Issue Date': c.issueDate ? formatDateForExport(c.issueDate) : '',
      'Due Date': formatDateForExport(c.dueDate),
      Status: c.status,
      'Cleared Date': c.clearedAt ? formatDateForExport(c.clearedAt) : '',
    }))
    const columns = [
      { key: 'Cheque #', label: 'Cheque #' },
      { key: 'Type', label: 'Type' },
      { key: 'Party', label: 'Party' },
      { key: 'Bank', label: 'Bank' },
      { key: 'Amount', label: 'Amount' },
      { key: 'Issue Date', label: 'Issue Date' },
      { key: 'Due Date', label: 'Due Date' },
      { key: 'Status', label: 'Status' },
      { key: 'Cleared Date', label: 'Cleared Date' },
    ]
    exportTableToCSV(exportData, columns, `cheque-report-${new Date().toISOString().split('T')[0]}`)
  }

  const subTabs = [
    { key: 'overview', label: t('tabs.overview') },
    { key: 'statusDist', label: t('tabs.statusDist') },
    { key: 'monthly', label: t('tabs.monthly') },
    { key: 'upcoming', label: t('tabs.upcoming') },
    { key: 'overdue', label: t('tabs.overdue') },
    { key: 'byBank', label: t('tabs.byBank') },
    { key: 'details', label: t('tabs.details') },
  ]

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide">
        {subTabs.map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => setSubTab(tabItem.key as ChequeReportTab)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              subTab === tabItem.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {subTab === 'monthly' && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Year</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {subTab === 'details' && (
          <Button variant="outline" size="sm" onClick={handleExportDetailsCSV}>
            {tc('export.asCsv')}
          </Button>
        )}
      </div>

      {/* Overview Tab */}
      {subTab === 'overview' && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.incoming')}</CardTitle>
                <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.incoming.total)}</div>
                <p className="text-xs text-muted-foreground">{summary.incoming.count} {t('summary.count')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.outgoing')}</CardTitle>
                <ArrowUpFromLine className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.outgoing.total)}</div>
                <p className="text-xs text-muted-foreground">{summary.outgoing.count} {t('summary.count')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.pending')}</CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.pending.total)}</div>
                <p className="text-xs text-muted-foreground">{summary.pending.count} {t('summary.count')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.cleared')}</CardTitle>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.cleared.total)}</div>
                <p className="text-xs text-muted-foreground">{summary.cleared.count} {t('summary.count')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.overdue')}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.overdue.total)}</div>
                <p className="text-xs text-muted-foreground">{summary.overdue.count} {t('summary.count')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.bouncedReturned')}</CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.bouncedReturned.total)}</div>
                <p className="text-xs text-muted-foreground">{summary.bouncedReturned.count} {t('summary.count')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Incoming vs Outgoing Chart */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium mb-3">{t('tabs.overview')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: t('types.INCOMING'), amount: summary.incoming.total, count: summary.incoming.count },
                { name: t('types.OUTGOING'), amount: summary.outgoing.total, count: summary.outgoing.count },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Status Distribution Tab */}
      {subTab === 'statusDist' && statusDist.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium mb-3">{t('tabs.statusDist')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusDist.filter((s: any) => s.count > 0)} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label={({ status, count }: any) => `${status}: ${count}`}>
                  {statusDist.filter((s: any) => s.count > 0).map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => v} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('filters.status')}</TableHead>
                  <TableHead className="text-end">{t('summary.count')}</TableHead>
                  <TableHead className="text-end">{t('summary.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusDist.map((s: any) => (
                  <TableRow key={s.status}>
                    <TableCell><Badge variant={STATUS_VARIANTS[s.status]}>{t(`statuses.${s.status}` as any)}</Badge></TableCell>
                    <TableCell className="text-end">{s.count}</TableCell>
                    <TableCell className="text-end font-medium">{formatCurrency(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Monthly Activity Tab */}
      {subTab === 'monthly' && monthly.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">{t('monthly.title')}</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthly.map((m: any) => ({ name: MONTHS[m.month - 1], incoming: m.incoming, outgoing: m.outgoing }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="incoming" name={t('monthly.incoming')} fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outgoing" name={t('monthly.outgoing')} fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Upcoming Tab */}
      {subTab === 'upcoming' && upcoming && (
        <div className="space-y-4">
          {[
            { key: 'thisWeek', label: t('upcoming.thisWeek'), data: upcoming.thisWeek },
            { key: 'next7Days', label: t('upcoming.next7Days'), data: upcoming.next7Days },
            { key: 'next30Days', label: t('upcoming.next30Days'), data: upcoming.next30Days },
          ].map(period => (
            <div key={period.key} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">{period.label}</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-600">{t('upcoming.expectedIncoming')}: {formatCurrency(period.data.incoming)}</span>
                  <span className="text-rose-600">{t('upcoming.expectedOutgoing')}: {formatCurrency(period.data.outgoing)}</span>
                </div>
              </div>
              {period.data.cheques.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tc('common.noData')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('detailsTable.number')}</TableHead>
                      <TableHead>{t('detailsTable.type')}</TableHead>
                      <TableHead>{t('detailsTable.party')}</TableHead>
                      <TableHead className="text-end">{t('detailsTable.amount')}</TableHead>
                      <TableHead>{t('detailsTable.dueDate')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {period.data.cheques.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.chequeNumber}</TableCell>
                        <TableCell>
                          <Badge variant={c.type === 'INCOMING' ? 'success' : 'destructive'}>
                            {t(`types.${c.type}` as any)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{c.partyName}</TableCell>
                        <TableCell className="text-end font-medium">{formatCurrency(c.amount)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDate(c.dueDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Overdue Tab */}
      {subTab === 'overdue' && overdueData && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">{t('overdueReport.totalOverdue')}</div>
                <div className="text-2xl font-bold">{formatCurrency(overdueData.summary.total)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">{t('overdueReport.incomingOverdue')}</div>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(overdueData.summary.incoming)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">{t('overdueReport.outgoingOverdue')}</div>
                <div className="text-2xl font-bold text-rose-600">{formatCurrency(overdueData.summary.outgoing)}</div>
              </CardContent>
            </Card>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('detailsTable.number')}</TableHead>
                  <TableHead>{t('detailsTable.type')}</TableHead>
                  <TableHead>{t('detailsTable.party')}</TableHead>
                  <TableHead className="text-end">{t('detailsTable.amount')}</TableHead>
                  <TableHead>{t('detailsTable.dueDate')}</TableHead>
                  <TableHead className="text-end">{t('overdueReport.daysOverdue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueData.cheques.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{tc('common.noData')}</TableCell></TableRow>
                ) : overdueData.cheques.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.chequeNumber}</TableCell>
                    <TableCell>
                      <Badge variant={c.type === 'INCOMING' ? 'success' : 'destructive'}>
                        {t(`types.${c.type}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.partyName}</TableCell>
                    <TableCell className="text-end font-medium">{formatCurrency(c.amount)}</TableCell>
                    <TableCell className="text-destructive text-xs">{formatDate(c.dueDate)}</TableCell>
                    <TableCell className="text-end text-destructive font-medium">{c.daysOverdue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* By Bank Tab */}
      {subTab === 'byBank' && byBank.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium mb-3">{t('bankAnalysis.title')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byBank.map((b: any) => ({ name: b.bank, incoming: b.incoming, outgoing: b.outgoing }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="incoming" name={t('bankAnalysis.incoming')} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outgoing" name={t('bankAnalysis.outgoing')} fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('bankAnalysis.bank')}</TableHead>
                  <TableHead className="text-end">{t('summary.count')}</TableHead>
                  <TableHead className="text-end">{t('bankAnalysis.incoming')}</TableHead>
                  <TableHead className="text-end">{t('bankAnalysis.outgoing')}</TableHead>
                  <TableHead className="text-end">{t('bankAnalysis.cleared')}</TableHead>
                  <TableHead className="text-end">{t('bankAnalysis.pending')}</TableHead>
                  <TableHead className="text-end">{t('bankAnalysis.bounced')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byBank.map((b: any) => (
                  <TableRow key={b.bank}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                      {b.bank}
                    </TableCell>
                    <TableCell className="text-end">{b.count}</TableCell>
                    <TableCell className="text-end text-emerald-600">{formatCurrency(b.incoming)}</TableCell>
                    <TableCell className="text-end text-rose-600">{formatCurrency(b.outgoing)}</TableCell>
                    <TableCell className="text-end">{formatCurrency(b.cleared)}</TableCell>
                    <TableCell className="text-end">{formatCurrency(b.pending)}</TableCell>
                    <TableCell className="text-end">{formatCurrency(b.bounced)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Details Tab */}
      {subTab === 'details' && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('detailsTable.number')}</TableHead>
                <TableHead className="whitespace-nowrap">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-7 w-[110px] text-xs border-transparent hover:border-border">
                      <SelectValue placeholder={t('detailsTable.type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t('filters.all')}</SelectItem>
                      <SelectItem value="INCOMING">{t('types.INCOMING')}</SelectItem>
                      <SelectItem value="OUTGOING">{t('types.OUTGOING')}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead>{t('detailsTable.party')}</TableHead>
                <TableHead className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{t('detailsTable.bank')}</span>
                    <Input
                      value={filterBank}
                      onChange={e => setFilterBank(e.target.value)}
                      placeholder={t('filters.bank')}
                      className="h-7 w-[120px] text-xs"
                    />
                  </div>
                </TableHead>
                <TableHead className="text-end">{t('detailsTable.amount')}</TableHead>
                <TableHead>{t('detailsTable.issueDate')}</TableHead>
                <TableHead>{t('detailsTable.dueDate')}</TableHead>
                <TableHead className="whitespace-nowrap">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-7 w-[110px] text-xs border-transparent hover:border-border">
                      <SelectValue placeholder={t('detailsTable.status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t('filters.all')}</SelectItem>
                      {['PENDING','DEPOSITED','PRESENTED','CLEARED','BOUNCED','RETURNED','CANCELLED'].map(s => (
                        <SelectItem key={s} value={s}>{t(`statuses.${s}` as any)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead>{t('detailsTable.clearedDate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">{tc('common.noData')}</TableCell></TableRow>
              ) : details.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs font-medium">{c.chequeNumber}</TableCell>
                  <TableCell>
                    <Badge variant={c.type === 'INCOMING' ? 'success' : 'destructive'}>
                      {t(`types.${c.type}` as any)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.partyName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.bankName || '—'}</TableCell>
                  <TableCell className="text-end font-medium">{formatCurrency(c.amount)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.issueDate ? formatDate(c.issueDate) : '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDate(c.dueDate)}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANTS[c.status]}>{t(`statuses.${c.status}` as any)}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.clearedAt ? formatDate(c.clearedAt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
