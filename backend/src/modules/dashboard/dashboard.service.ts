import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const [todaySales, monthSales, todayExpenses, monthExpenses,
      totalCustomers, totalProducts, totalSalesCount, lowStockCount,
      customerDebt, supplierDebt] = await Promise.all([
      this.prisma.sale.aggregate({ where: { createdAt: { gte: today }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
      this.prisma.sale.aggregate({ where: { createdAt: { gte: monthStart }, status: 'COMPLETED' }, _sum: { total: true }, _count: true }),
      this.prisma.expense.aggregate({ where: { date: { gte: today } }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { date: { gte: monthStart } }, _sum: { amount: true } }),
      this.prisma.customer.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.sale.count({ where: { status: 'COMPLETED' } }),
      this.prisma.inventory.count({ where: { quantity: { lte: this.prisma.inventory.fields.minStock as any } } }),
      this.prisma.customer.aggregate({ _sum: { debt: true } }),
      this.prisma.supplier.aggregate({ _sum: { totalDebt: true } }),
    ])

    const todayProfit = Number(todaySales._sum.total ?? 0) - Number(todayExpenses._sum.amount ?? 0)

    return {
      todaySales: Number(todaySales._sum.total ?? 0),
      todaySalesCount: todaySales._count,
      todayExpenses: Number(todayExpenses._sum.amount ?? 0),
      todayProfit,
      monthlyRevenue: Number(monthSales._sum.total ?? 0),
      monthlySalesCount: monthSales._count,
      monthlyExpenses: Number(monthExpenses._sum.amount ?? 0),
      totalCustomers,
      totalProducts,
      totalSalesCount,
      lowStockCount,
      customerDebt: Number(customerDebt._sum.debt ?? 0),
      supplierDebt: Number(supplierDebt._sum.totalDebt ?? 0),
    }
  }

  async getChartData(period: string = 'week') {
    const now = new Date()
    const points: { label: string; start: Date; end: Date }[] = []
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateLabel = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const monthDayLabel = (d: Date) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const monthLabel = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    const timeLabel = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

    if (period === 'day') {
      const base = new Date(now)
      base.setMinutes(0, 0, 0)
      for (let i = 23; i >= 0; i--) {
        const start = new Date(base)
        start.setHours(start.getHours() - i)
        const end = new Date(start)
        end.setHours(end.getHours() + 1)
        points.push({ label: timeLabel(start), start, end })
      }
    } else if (period === 'month') {
      const base = new Date(now)
      base.setHours(0, 0, 0, 0)
      for (let i = 29; i >= 0; i--) {
        const start = new Date(base)
        start.setDate(start.getDate() - i)
        const end = new Date(start)
        end.setDate(end.getDate() + 1)
        points.push({ label: monthDayLabel(start), start, end })
      }
    } else if (period === 'year') {
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        points.push({ label: monthLabel(start), start, end })
      }
    } else {
      const base = new Date(now)
      base.setHours(0, 0, 0, 0)
      for (let i = 6; i >= 0; i--) {
        const start = new Date(base)
        start.setDate(start.getDate() - i)
        const end = new Date(start)
        end.setDate(end.getDate() + 1)
        points.push({ label: dateLabel(start), start, end })
      }
    }

    return Promise.all(
      points.map(async ({ label, start, end }) => {
        const [rev, exp] = await Promise.all([
          this.prisma.sale.aggregate({
            where: { status: 'COMPLETED', createdAt: { gte: start, lt: end } },
            _sum: { total: true },
          }),
          this.prisma.expense.aggregate({
            where: { date: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
        ])
        return {
          label,
          revenue: Number(rev._sum.total ?? 0),
          expenses: Number(exp._sum.amount ?? 0),
        }
      }),
    )
  }

  async getTopProducts() {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const rows = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { status: 'COMPLETED', createdAt: { gte: monthStart } } },
      _sum: { quantity: true, total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    })

    const ids = rows.map(r => r.productId)
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, sku: true }
    })
    const pMap = Object.fromEntries(products.map(p => [p.id, p]))

    return rows.map(r => ({
      productId: r.productId,
      name: pMap[r.productId]?.name ?? r.productId,
      sku: pMap[r.productId]?.sku ?? '',
      quantity: r._sum.quantity ?? 0,
      revenue: Number(r._sum.total ?? 0),
      salesCount: r._count
    }))
  }

  async getRecentSales(limit: number = 10, page: number = 1) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where: { status: 'COMPLETED' },
        include: { customer: { select: { name: true } }, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.sale.count({ where: { status: 'COMPLETED' } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getLowStock() {
    // Fetch all inventory, then filter in-memory since Prisma doesn't support column-to-column comparison in where
    const allInventory = await this.prisma.inventory.findMany({
      include: {
        product: { select: { name: true, sku: true } },
      },
    })

    return allInventory
      .filter(row => row.quantity <= row.minStock)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 10)
      .map(row => ({
        id: row.id,
        quantity: row.quantity,
        minStock: row.minStock,
        productId: row.productId,
        productName: row.product.name,
        sku: row.product.sku,
      }))
  }

  async getTodaysSalesDetail() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return this.prisma.sale.findMany({
      where: { createdAt: { gte: today }, status: { in: ['COMPLETED', 'PARTIALLY_REFUNDED'] } },
      include: {
        customer: { select: { name: true } },
        user: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getOutstandingReceivables() {
    return this.prisma.sale.findMany({
      where: { paymentStatus: { in: ['PARTIALLY_PAID', 'UNPAID'] } },
      include: {
        customer: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getOutstandingPayables() {
    return this.prisma.purchaseOrder.findMany({
      where: { paymentStatus: { in: ['PARTIALLY_PAID', 'UNPAID'] } },
      include: {
        supplier: { select: { companyName: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getNetProfit(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate
      ? { createdAt: { gte: startDate, lte: endDate } }
      : {}

    const sales = await this.prisma.sale.findMany({
      where: { ...dateFilter, status: { in: ['COMPLETED', 'PARTIALLY_REFUNDED'] } },
      include: {
        customer: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const profitData = sales.map(sale => {
      const profit = sale.items.reduce((sum, item) => {
        const itemProfit = (Number(item.sellingPrice) - Number(item.costPrice)) * item.quantity
        return sum + itemProfit
      }, 0)

      return {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        customer: sale.customer?.name ?? 'Walk-in',
        date: sale.createdAt,
        revenue: Number(sale.total),
        cost: sale.items.reduce((sum, item) => sum + Number(item.costPrice) * item.quantity, 0),
        profit,
        items: sale.items.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          costPrice: Number(item.costPrice),
          sellingPrice: Number(item.sellingPrice),
          profit: (Number(item.sellingPrice) - Number(item.costPrice)) * item.quantity,
        })),
      }
    })

    const totalProfit = profitData.reduce((sum, sale) => sum + sale.profit, 0)
    const totalRevenue = profitData.reduce((sum, sale) => sum + sale.revenue, 0)
    const totalCost = profitData.reduce((sum, sale) => sum + sale.cost, 0)

    return {
      totalProfit,
      totalRevenue,
      totalCost,
      sales: profitData,
    }
  }
}
