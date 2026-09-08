import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async salesSummary(dateFrom: string, dateTo: string) {
    const where = {
      status: 'COMPLETED' as const,
      createdAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
    }

    const [agg, byDay] = await Promise.all([
      this.prisma.sale.aggregate({ where, _count: true, _sum: { total: true, discount: true }, _avg: { total: true } }),
      this.prisma.sale.groupBy({
        by: ['createdAt'],
        where,
        _sum: { total: true },
        _count: true,
        orderBy: { createdAt: 'asc' },
      }),
    ])

    // Group by day (YYYY-MM-DD)
    const dayMap: Record<string, { date: string; revenue: number; count: number }> = {}
    for (const row of byDay) {
      const day = row.createdAt.toISOString().slice(0, 10)
      if (!dayMap[day]) dayMap[day] = { date: day, revenue: 0, count: 0 }
      dayMap[day].revenue += Number(row._sum.total ?? 0)
      dayMap[day].count += row._count
    }

    return {
      totalRevenue: Number(agg._sum.total ?? 0),
      totalSales: agg._count,
      avgSaleValue: Number(agg._avg.total ?? 0),
      totalDiscount: Number(agg._sum.discount ?? 0),
      byDay: Object.values(dayMap),
    }
  }

  async expensesSummary(dateFrom: string, dateTo: string) {
    const where = {
      date: { gte: new Date(dateFrom), lte: new Date(dateTo) },
    }

    const [agg, byCategory] = await Promise.all([
      this.prisma.expense.aggregate({ where, _count: true, _sum: { amount: true } }),
      this.prisma.expense.groupBy({ by: ['category'], where, _sum: { amount: true }, _count: true }),
    ])

    return {
      totalExpenses: Number(agg._sum.amount ?? 0),
      count: agg._count,
      byCategory: byCategory.map(c => ({ category: c.category, total: Number(c._sum.amount ?? 0), count: c._count })),
    }
  }

  async topProducts(dateFrom: string, dateTo: string, limit = 10) {
    const where = {
      sale: {
        status: 'COMPLETED' as const,
        createdAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      },
    }

    const rows = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where,
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    })

    const productIds = rows.map(r => r.productId)
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, category: { select: { name: true } } },
    })
    const productMap = Object.fromEntries(products.map(p => [p.id, p]))

    return rows.map(r => ({
      productId: r.productId,
      productName: productMap[r.productId]?.name ?? r.productId,
      sku: productMap[r.productId]?.sku ?? '',
      category: productMap[r.productId]?.category?.name ?? '',
      qtySold: r._sum.quantity ?? 0,
      revenue: Number(r._sum.total ?? 0),
    }))
  }

  async paymentMethods(dateFrom: string, dateTo: string) {
    const where = {
      status: 'COMPLETED' as const,
      createdAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
    }

    const rows = await this.prisma.sale.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { total: true },
      _count: true,
    })

    return rows.map(r => ({ method: r.paymentMethod, total: Number(r._sum.total ?? 0), count: r._count }))
  }

  async revenueVsExpenses(year: number) {
    const start = new Date(`${year}-01-01`)
    const end = new Date(`${year}-12-31T23:59:59`)

    const [sales, expenses] = await Promise.all([
      this.prisma.sale.groupBy({
        by: ['createdAt'],
        where: { status: 'COMPLETED', createdAt: { gte: start, lte: end } },
        _sum: { total: true },
      }),
      this.prisma.expense.groupBy({
        by: ['date'],
        where: { date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ])

    const monthRevenue: number[] = Array(12).fill(0)
    const monthExpenses: number[] = Array(12).fill(0)

    for (const row of sales) {
      const m = new Date(row.createdAt).getMonth()
      monthRevenue[m] += Number(row._sum.total ?? 0)
    }
    for (const row of expenses) {
      const m = new Date(row.date).getMonth()
      monthExpenses[m] += Number(row._sum.amount ?? 0)
    }

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return months.map((name, i) => ({ month: name, revenue: monthRevenue[i], expenses: monthExpenses[i], profit: monthRevenue[i] - monthExpenses[i] }))
  }

  async profitReport(dateFrom: string, dateTo: string) {
    const where = {
      sale: {
        status: { in: ['COMPLETED', 'PARTIALLY_REFUNDED'] } as any,
        createdAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      },
    }

    const saleItems: any = await this.prisma.saleItem.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
    })

    // Group by product
    const productMap = new Map<string, any>()

    saleItems.forEach((item: any) => {
      const productId = item.productId
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          productId,
          productName: item.product?.name ?? 'Unknown',
          quantitySold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        })
      }

      const data = productMap.get(productId)
      data.quantitySold += item.quantity
      data.revenue += Number(item.total)
      data.cost += Number(item.costPrice) * item.quantity
      data.profit += (Number(item.sellingPrice) - Number(item.costPrice)) * item.quantity
    })

    // Convert to array and add margin
    const profitData = Array.from(productMap.values()).map(item => ({
      ...item,
      margin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
    }))

    // Sort by profit descending
    profitData.sort((a, b) => b.profit - a.profit)

    return profitData
  }

  async outstandingReceivables() {
    const where: any = {
      paymentStatus: { in: ['PARTIALLY_PAID', 'UNPAID'] },
    }

    const sales: any = await this.prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by customer
    const customerMap = new Map<string, any>()

    sales.forEach((sale: any) => {
      const customerId = sale.customerId ?? 'walk-in'
      const customerName = sale.customer?.name ?? 'Walk-in'

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId,
          customerName,
          phone: sale.customer?.phone ?? null,
          totalPurchases: 0,
          totalPaid: 0,
          balance: 0,
        })
      }

      const data = customerMap.get(customerId)
      data.totalPurchases += Number(sale.total)
      data.totalPaid += Number(sale.amountPaid)
      data.balance += Number(sale.amountDue)
    })

    const receivables = Array.from(customerMap.values())

    // Sort by balance descending
    receivables.sort((a, b) => b.balance - a.balance)

    return receivables
  }

  async outstandingPayables() {
    const purchaseOrders: any = await this.prisma.purchaseOrder.findMany({
      where: {
        paymentStatus: { in: ['PARTIALLY_PAID', 'UNPAID'] },
      },
      include: {
        supplier: { select: { id: true, companyName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by supplier
    const supplierMap = new Map<string, any>()

    purchaseOrders.forEach((po: any) => {
      const supplierId = po.supplierId

      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          supplierId,
          supplierName: po.supplier.companyName,
          contact: po.supplier.phone ?? null,
          totalPurchases: 0,
          totalPaid: 0,
          balance: 0,
        })
      }

      const data = supplierMap.get(supplierId)
      data.totalPurchases += Number(po.total)
      data.totalPaid += Number(po.amountPaid)
      data.balance += Number(po.amountDue)
    })

    const payables = Array.from(supplierMap.values())

    // Sort by balance descending
    payables.sort((a, b) => b.balance - a.balance)

    return payables
  }

  async loanReport(dateFrom: string, dateTo: string, type?: string) {
    const where: any = {
      createdAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      ...(type ? { type: type as any } : {}),
    }

    const loans = await this.prisma.loan.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        supplier: { select: { companyName: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return loans.map(loan => ({
      id: loan.id,
      type: loan.type,
      entityName: loan.type === 'CUSTOMER_LOAN'
        ? loan.customer?.name ?? 'Unknown'
        : loan.supplier?.companyName ?? 'Unknown',
      amount: Number(loan.principalAmount),
      paidAmount: Number(loan.amountPaid),
      status: loan.status,
      dueDate: loan.dueDate,
    }))
  }

  async purchaseReport(dateFrom: string, dateTo: string) {
    const purchaseOrders: any = await this.prisma.purchaseOrder.findMany({
      where: {
        createdAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      },
      include: {
        supplier: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return purchaseOrders.map((po: any) => ({
      id: po.id,
      orderNumber: po.orderNumber,
      supplierName: po.supplier.companyName,
      totalAmount: Number(po.total),
      paidAmount: Number(po.amountPaid),
      status: po.status,
      orderDate: po.createdAt,
    }))
  }

  async cashflowReport(dateFrom: string, dateTo: string) {
    const where = {
      createdAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
    }

    // Sales Revenue (Inflow)
    const sales: any = await this.prisma.sale.findMany({
      where: { ...where, status: 'COMPLETED' },
      select: { total: true },
    })
    const salesRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.total), 0)

    // Customer Payments (Inflow) - sum of amountPaid from sales
    const customerPayments = 0 // Simplified for now

    // Loan Repayments (Inflow) - payments from CUSTOMER_LOAN type
    const loanRepayments = 0 // Simplified for now

    // Purchase Orders (Outflow)
    const purchaseOrders: any = await this.prisma.purchaseOrder.findMany({
      where,
      select: { total: true },
    })
    const purchaseOrdersTotal = purchaseOrders.reduce((sum: number, po: any) => sum + Number(po.total), 0)

    // Expenses (Outflow)
    const expenses: any = await this.prisma.expense.findMany({
      where,
      select: { amount: true },
    })
    const expensesTotal = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

    // Supplier Payments (Outflow)
    const supplierPayments = 0 // Simplified for now

    const totalInflow = salesRevenue + customerPayments + loanRepayments
    const totalOutflow = purchaseOrdersTotal + expensesTotal + supplierPayments

    return {
      totalInflow,
      totalOutflow,
      salesRevenue,
      customerPayments,
      loanRepayments,
      purchaseOrders: purchaseOrdersTotal,
      expenses: expensesTotal,
      supplierPayments,
    }
  }

  async cashFlowReport(date: string) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const [salesInflow, expenses, supplierPayments, loanPaymentsReceived, loanPaymentsMade] = await Promise.all([
      // Cash inflow from sales
      this.prisma.payment.aggregate({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
      // Cash outflow - expenses
      this.prisma.expense.aggregate({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
      // Cash outflow - supplier payments
      this.prisma.supplierPayment.aggregate({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
      // Cash inflow - loan payments received
      this.prisma.loanPayment.aggregate({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          loan: { type: 'CUSTOMER_LOAN' },
        },
        _sum: { amount: true },
      }),
      // Cash outflow - loan payments made
      this.prisma.loanPayment.aggregate({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          loan: { type: 'SUPPLIER_LOAN' },
        },
        _sum: { amount: true },
      }),
    ])

    const totalInflow = Number(salesInflow._sum.amount ?? 0) + Number(loanPaymentsReceived._sum.amount ?? 0)
    const totalOutflow = Number(expenses._sum.amount ?? 0) + Number(supplierPayments._sum.amount ?? 0) + Number(loanPaymentsMade._sum.amount ?? 0)
    const netCashFlow = totalInflow - totalOutflow

    return {
      date: startOfDay,
      inflow: {
        sales: Number(salesInflow._sum.amount ?? 0),
        loanPayments: Number(loanPaymentsReceived._sum.amount ?? 0),
        total: totalInflow,
      },
      outflow: {
        expenses: Number(expenses._sum.amount ?? 0),
        supplierPayments: Number(supplierPayments._sum.amount ?? 0),
        loanPayments: Number(loanPaymentsMade._sum.amount ?? 0),
        total: totalOutflow,
      },
      netCashFlow,
    }
  }

  // ── Cheque Reports (completely independent) ──────────────────────

  async chequeSummary(dateFrom?: string, dateTo?: string) {
    const dateFilter: any = {}
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {}
      if (dateFrom) dateFilter.createdAt.gte = new Date(dateFrom)
      if (dateTo) dateFilter.createdAt.lte = new Date(dateTo)
    }

    const now = new Date()
    const activeStatuses = { notIn: ['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'] as const }

    const [
      totalIncoming,
      totalOutgoing,
      cleared,
      pending,
      overdue,
      bouncedReturned,
    ] = await Promise.all([
      this.prisma.cheque.aggregate({
        where: { type: 'INCOMING', ...dateFilter },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.cheque.aggregate({
        where: { type: 'OUTGOING', ...dateFilter },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.cheque.aggregate({
        where: { status: 'CLEARED', ...dateFilter },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.cheque.aggregate({
        where: { status: activeStatuses, ...dateFilter },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.cheque.aggregate({
        where: {
          status: activeStatuses,
          dueDate: { lt: now },
          ...dateFilter,
        },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.cheque.aggregate({
        where: {
          status: { in: ['BOUNCED', 'RETURNED'] },
          ...dateFilter,
        },
        _count: true,
        _sum: { amount: true },
      }),
    ])

    return {
      incoming: { count: totalIncoming._count, total: Number(totalIncoming._sum.amount ?? 0) },
      outgoing: { count: totalOutgoing._count, total: Number(totalOutgoing._sum.amount ?? 0) },
      cleared: { count: cleared._count, total: Number(cleared._sum.amount ?? 0) },
      pending: { count: pending._count, total: Number(pending._sum.amount ?? 0) },
      overdue: { count: overdue._count, total: Number(overdue._sum.amount ?? 0) },
      bouncedReturned: { count: bouncedReturned._count, total: Number(bouncedReturned._sum.amount ?? 0) },
    }
  }

  async chequeStatusDistribution(dateFrom?: string, dateTo?: string) {
    const dateFilter: any = {}
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {}
      if (dateFrom) dateFilter.createdAt.gte = new Date(dateFrom)
      if (dateTo) dateFilter.createdAt.lte = new Date(dateTo)
    }

    const statuses = ['PENDING', 'DEPOSITED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'RETURNED', 'CANCELLED']
    const results = await Promise.all(
      statuses.map(status =>
        this.prisma.cheque.aggregate({
          where: { status: status as any, ...dateFilter },
          _count: true,
          _sum: { amount: true },
        })
      )
    )

    return statuses.map((status, i) => ({
      status,
      count: results[i]._count,
      total: Number(results[i]._sum.amount ?? 0),
    }))
  }

  async chequeMonthlyActivity(year: number) {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year + 1, 0, 1)

    const cheques = await this.prisma.cheque.findMany({
      where: { createdAt: { gte: startOfYear, lt: endOfYear } },
      select: { type: true, amount: true, createdAt: true },
    })

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      incoming: 0,
      outgoing: 0,
      incomingCount: 0,
      outgoingCount: 0,
    }))

    for (const c of cheques) {
      const m = c.createdAt.getMonth()
      if (c.type === 'INCOMING') {
        months[m].incoming += Number(c.amount)
        months[m].incomingCount++
      } else {
        months[m].outgoing += Number(c.amount)
        months[m].outgoingCount++
      }
    }

    return months
  }

  async chequeUpcoming() {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const in7 = new Date(today)
    in7.setDate(in7.getDate() + 7)
    const in30 = new Date(today)
    in30.setDate(in30.getDate() + 30)

    const activeStatuses: any = { notIn: ['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'] }

    const [todayCheques, weekCheques, monthCheques] = await Promise.all([
      this.prisma.cheque.findMany({
        where: { status: activeStatuses, dueDate: { gte: today, lt: in7 } },
        include: { customer: { select: { name: true } }, supplier: { select: { companyName: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.cheque.findMany({
        where: { status: activeStatuses, dueDate: { gte: in7, lt: in30 } },
        include: { customer: { select: { name: true } }, supplier: { select: { companyName: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.cheque.findMany({
        where: { status: activeStatuses, dueDate: { gte: in30 } },
        include: { customer: { select: { name: true } }, supplier: { select: { companyName: true } } },
        orderBy: { dueDate: 'asc' },
      }),
    ])

    const mapCheques = (list: any[]) => list.map(c => ({
      ...c,
      amount: Number(c.amount),
      partyName: c.customer?.name || c.supplier?.companyName || c.partyName || '—',
    }))

    return {
      thisWeek: { cheques: mapCheques(todayCheques), total: todayCheques.reduce((s, c) => s + Number(c.amount), 0), incoming: todayCheques.filter(c => c.type === 'INCOMING').reduce((s, c) => s + Number(c.amount), 0), outgoing: todayCheques.filter(c => c.type === 'OUTGOING').reduce((s, c) => s + Number(c.amount), 0) },
      next7Days: { cheques: mapCheques(weekCheques), total: weekCheques.reduce((s, c) => s + Number(c.amount), 0), incoming: weekCheques.filter(c => c.type === 'INCOMING').reduce((s, c) => s + Number(c.amount), 0), outgoing: weekCheques.filter(c => c.type === 'OUTGOING').reduce((s, c) => s + Number(c.amount), 0) },
      next30Days: { cheques: mapCheques(monthCheques), total: monthCheques.reduce((s, c) => s + Number(c.amount), 0), incoming: monthCheques.filter(c => c.type === 'INCOMING').reduce((s, c) => s + Number(c.amount), 0), outgoing: monthCheques.filter(c => c.type === 'OUTGOING').reduce((s, c) => s + Number(c.amount), 0) },
    }
  }

  async chequeOverdue() {
    const now = new Date()
    const activeStatuses: any = { notIn: ['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'] }

    const overdueCheques = await this.prisma.cheque.findMany({
      where: { status: activeStatuses, dueDate: { lt: now } },
      include: {
        customer: { select: { name: true } },
        supplier: { select: { companyName: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    const mapped = overdueCheques.map(c => ({
      id: c.id,
      chequeNumber: c.chequeNumber,
      type: c.type,
      amount: Number(c.amount),
      dueDate: c.dueDate,
      status: c.status,
      bankName: c.bankName,
      partyName: c.customer?.name || c.supplier?.companyName || c.partyName || '—',
      daysOverdue: Math.floor((now.getTime() - c.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    }))

    const totalOverdue = mapped.reduce((s, c) => s + c.amount, 0)
    const incomingOverdue = mapped.filter(c => c.type === 'INCOMING').reduce((s, c) => s + c.amount, 0)
    const outgoingOverdue = mapped.filter(c => c.type === 'OUTGOING').reduce((s, c) => s + c.amount, 0)

    return {
      cheques: mapped,
      summary: { total: totalOverdue, incoming: incomingOverdue, outgoing: outgoingOverdue, count: mapped.length },
    }
  }

  async chequeByBank(dateFrom?: string, dateTo?: string) {
    const dateFilter: any = {}
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {}
      if (dateFrom) dateFilter.createdAt.gte = new Date(dateFrom)
      if (dateTo) dateFilter.createdAt.lte = new Date(dateTo)
    }

    const cheques = await this.prisma.cheque.findMany({
      where: dateFilter,
      select: { bankName: true, type: true, amount: true, status: true },
    })

    const bankMap: Record<string, { incoming: number; outgoing: number; cleared: number; pending: number; bounced: number; count: number }> = {}

    for (const c of cheques) {
      const bank = c.bankName || 'Unknown'
      if (!bankMap[bank]) bankMap[bank] = { incoming: 0, outgoing: 0, cleared: 0, pending: 0, bounced: 0, count: 0 }
      bankMap[bank].count++
      const amt = Number(c.amount)
      if (c.type === 'INCOMING') bankMap[bank].incoming += amt
      else bankMap[bank].outgoing += amt
      if (c.status === 'CLEARED') bankMap[bank].cleared += amt
      else if (['PENDING', 'DEPOSITED', 'PRESENTED'].includes(c.status)) bankMap[bank].pending += amt
      else if (['BOUNCED', 'RETURNED'].includes(c.status)) bankMap[bank].bounced += amt
    }

    return Object.entries(bankMap).map(([bank, data]) => ({ bank, ...data }))
  }

  async chequeDetails(dateFrom?: string, dateTo?: string, type?: string, status?: string, bankName?: string) {
    const where: any = {}
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }
    if (type) where.type = type
    if (status) where.status = status
    if (bankName) where.bankName = { contains: bankName }

    const cheques = await this.prisma.cheque.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        supplier: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return cheques.map(c => ({
      id: c.id,
      chequeNumber: c.chequeNumber,
      type: c.type,
      amount: Number(c.amount),
      issueDate: c.issueDate,
      dueDate: c.dueDate,
      bankName: c.bankName,
      status: c.status,
      partyName: c.customer?.name || c.supplier?.companyName || c.partyName || '—',
      clearedAt: c.clearedAt,
      createdAt: c.createdAt,
    }))
  }
}
