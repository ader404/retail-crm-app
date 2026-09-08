import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats() { return this.dashboardService.getStats() }

  @Get('chart-data')
  getChartData(@Query('period') period?: string) {
    return this.dashboardService.getChartData(period)
  }

  @Get('top-products')
  getTopProducts() { return this.dashboardService.getTopProducts() }

  @Get('recent-sales')
  getRecentSales(@Query('limit') limit?: string, @Query('page') page?: string) {
    return this.dashboardService.getRecentSales(
      limit ? parseInt(limit, 10) : 10,
      page ? parseInt(page, 10) : 1
    )
  }

  @Get('low-stock')
  getLowStock() { return this.dashboardService.getLowStock() }

  @Get('todays-sales-detail')
  getTodaysSalesDetail() {
    return this.dashboardService.getTodaysSalesDetail()
  }

  @Get('outstanding-receivables')
  getOutstandingReceivables() {
    return this.dashboardService.getOutstandingReceivables()
  }

  @Get('outstanding-payables')
  getOutstandingPayables() {
    return this.dashboardService.getOutstandingPayables()
  }

  @Get('net-profit')
  getNetProfit(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getNetProfit(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    )
  }
}
