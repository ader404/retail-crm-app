import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ReportsService } from './reports.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  salesSummary(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) { return this.reportsService.salesSummary(dateFrom, dateTo) }

  @Get('expenses')
  expensesSummary(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) { return this.reportsService.expensesSummary(dateFrom, dateTo) }

  @Get('top-products')
  topProducts(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('limit') limit?: string,
  ) { return this.reportsService.topProducts(dateFrom, dateTo, limit ? +limit : 10) }

  @Get('payment-methods')
  paymentMethods(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) { return this.reportsService.paymentMethods(dateFrom, dateTo) }

  @Get('revenue-vs-expenses')
  revenueVsExpenses(
    @Query('year') year: string,
  ) { return this.reportsService.revenueVsExpenses(+year || new Date().getFullYear()) }

  @Get('profit')
  profitReport(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) { return this.reportsService.profitReport(dateFrom, dateTo) }

  @Get('outstanding-receivables')
  outstandingReceivables() {
    return this.reportsService.outstandingReceivables()
  }

  @Get('outstanding-payables')
  outstandingPayables() {
    return this.reportsService.outstandingPayables()
  }

  @Get('loans')
  loanReport(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('type') type?: string,
  ) {
    return this.reportsService.loanReport(dateFrom, dateTo, type)
  }

  @Get('purchases')
  purchaseReport(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) { return this.reportsService.purchaseReport(dateFrom, dateTo) }

  @Get('cashflow')
  cashflowReport(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) { return this.reportsService.cashflowReport(dateFrom, dateTo) }

  @Get('cash-flow')
  cashFlowReport(
    @Query('date') date: string,
  ) { return this.reportsService.cashFlowReport(date) }

  // ── Cheque Reports ─────────────────────────────────────────────

  @Get('cheques/summary')
  chequeSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) { return this.reportsService.chequeSummary(dateFrom, dateTo) }

  @Get('cheques/status-distribution')
  chequeStatusDistribution(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) { return this.reportsService.chequeStatusDistribution(dateFrom, dateTo) }

  @Get('cheques/monthly-activity')
  chequeMonthlyActivity(
    @Query('year') year?: string,
  ) { return this.reportsService.chequeMonthlyActivity(year ? +year : new Date().getFullYear()) }

  @Get('cheques/upcoming')
  chequeUpcoming() { return this.reportsService.chequeUpcoming() }

  @Get('cheques/overdue')
  chequeOverdue() { return this.reportsService.chequeOverdue() }

  @Get('cheques/by-bank')
  chequeByBank(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) { return this.reportsService.chequeByBank(dateFrom, dateTo) }

  @Get('cheques/details')
  chequeDetails(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('bankName') bankName?: string,
  ) { return this.reportsService.chequeDetails(dateFrom, dateTo, type, status, bankName) }
}
