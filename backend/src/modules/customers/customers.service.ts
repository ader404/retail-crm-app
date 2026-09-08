import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { RecordCustomerPaymentDto } from './dto/record-customer-payment.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

const CUSTOMER_INCLUDE = {
  sales: { select: { id: true, invoiceNumber: true, total: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' as const }, take: 20 },
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(paginationDto?: PaginationDto): Promise<PaginatedResult<any>> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 10;
    const search = paginationDto?.search || '';
    const sortBy = paginationDto?.sortBy || 'createdAt';
    const sortOrder = paginationDto?.sortOrder || 'desc';

    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { sales: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(customer => ({
        ...customer,
        credit: Number(customer.credit),
        debt: Number(customer.debt),
        totalPaid: Number(customer.totalPaid),
      })),
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

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            items: { include: { product: { select: { name: true } } } },
            payments: true,
          },
        },
        loans: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Calculate total purchases and profit
    const totalPurchases = customer.sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const totalProfit = customer.sales.reduce((sum, sale) => {
      const saleProfit = sale.items.reduce((itemSum, item) => {
        return itemSum + (Number(item.sellingPrice) - Number(item.costPrice)) * item.quantity;
      }, 0);
      return sum + saleProfit;
    }, 0);

    // Transform to match frontend expectations
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
      credit: Number(customer.credit),
      debt: Number(customer.debt),
      totalPaid: Number(customer.totalPaid),
      createdAt: customer.createdAt,
      purchases: customer.sales.map(sale => {
        const saleProfit = sale.items.reduce((sum, item) => {
          return sum + (Number(item.sellingPrice) - Number(item.costPrice)) * item.quantity;
        }, 0);

        return {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          total: Number(sale.total),
          amountPaid: Number(sale.amountPaid),
          amountDue: Number(sale.amountDue),
          paymentStatus: sale.paymentStatus,
          profit: saleProfit,
          createdAt: sale.createdAt,
          items: sale.items.map(item => ({
            id: item.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: Number(item.sellingPrice),
            cost: Number(item.costPrice),
            profit: (Number(item.sellingPrice) - Number(item.costPrice)) * item.quantity,
          })),
        };
      }),
      loans: customer.loans.map(loan => ({
        id: loan.id,
        amount: Number(loan.principalAmount),
        amountPaid: Number(loan.amountPaid),
        balance: Number(loan.principalAmount) - Number(loan.amountPaid),
        status: loan.status,
        dueDate: loan.dueDate,
        createdAt: loan.createdAt,
      })),
      totalProfit,
      totalPurchases,
    };
  }

  async getCustomerLedger(id: string, startDate?: Date, endDate?: Date) {
    const customer = await this.prisma.customer.findUniqueOrThrow({ where: { id } });

    const dateFilter = startDate && endDate
      ? { createdAt: { gte: startDate, lte: endDate } }
      : {};

    const sales = await this.prisma.sale.findMany({
      where: { customerId: id, ...dateFilter },
      include: {
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let runningBalance = 0;
    const ledgerEntries: Array<{
      date: Date;
      type: string;
      reference: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }> = [];

    for (const sale of sales) {
      // Add sale entry
      ledgerEntries.push({
        date: sale.createdAt,
        type: 'SALE',
        reference: sale.invoiceNumber,
        description: `Sale`,
        debit: Number(sale.total),
        credit: 0,
        balance: runningBalance + Number(sale.total),
      });
      runningBalance += Number(sale.total);

      // Add payment entries
      for (const payment of sale.payments) {
        ledgerEntries.push({
          date: payment.createdAt,
          type: 'PAYMENT',
          reference: sale.invoiceNumber,
          description: `Payment - ${payment.method}`,
          debit: 0,
          credit: Number(payment.amount),
          balance: runningBalance - Number(payment.amount),
        });
        runningBalance -= Number(payment.amount);
      }
    }

    // Transform to match frontend expectations
    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      entries: ledgerEntries,
      openingBalance: 0,
      closingBalance: runningBalance,
      totalDebits: ledgerEntries.reduce((sum, e) => sum + e.debit, 0),
      totalCredits: ledgerEntries.reduce((sum, e) => sum + e.credit, 0),
    };
  }

  async getCustomerHistory(id: string, startDate?: Date, endDate?: Date) {
    const customer = await this.prisma.customer.findUniqueOrThrow({ where: { id } });

    const dateFilter = startDate && endDate
      ? { createdAt: { gte: startDate, lte: endDate } }
      : {};

    // Fetch all related data
    const sales = await this.prisma.sale.findMany({
      where: { customerId: id, ...dateFilter },
      include: {
        payments: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const loans = await this.prisma.loan.findMany({
      where: { customerId: id, type: 'CUSTOMER_LOAN', ...dateFilter },
      include: { payments: true },
      orderBy: { createdAt: 'desc' },
    });

    // Build activity timeline
    const activities: Array<{
      id: string;
      type: 'SALE' | 'PAYMENT' | 'REFUND' | 'LOAN_CREATED' | 'LOAN_PAYMENT';
      date: Date;
      amount: number;
      reference: string;
      description: string;
      status?: string;
      metadata?: any;
    }> = [];

    // Add sales
    for (const sale of sales) {
      activities.push({
        id: sale.id,
        type: sale.status === 'REFUNDED' || sale.status === 'PARTIALLY_REFUNDED' ? 'REFUND' : 'SALE',
        date: sale.createdAt,
        amount: Number(sale.total),
        reference: sale.invoiceNumber,
        description: sale.status === 'REFUNDED' ? `Sale refunded` : `Sale`,
        status: sale.paymentStatus,
        metadata: { itemCount: sale.items?.length || 0 },
      });

      // Add payments for this sale
      for (const payment of sale.payments) {
        activities.push({
          id: payment.id,
          type: 'PAYMENT',
          date: payment.createdAt,
          amount: Number(payment.amount),
          reference: sale.invoiceNumber,
          description: `Payment received - ${payment.method}`,
          metadata: { method: payment.method },
        });
      }
    }

    // Add loans
    for (const loan of loans) {
      activities.push({
        id: loan.id,
        type: 'LOAN_CREATED',
        date: loan.createdAt,
        amount: Number(loan.principalAmount),
        reference: `LOAN-${loan.id.slice(-8).toUpperCase()}`,
        description: `Loan created`,
        status: loan.status,
        metadata: { dueDate: loan.dueDate },
      });

      // Add loan payments
      for (const payment of loan.payments) {
        activities.push({
          id: payment.id,
          type: 'LOAN_PAYMENT',
          date: payment.createdAt,
          amount: Number(payment.amount),
          reference: `LOAN-${loan.id.slice(-8).toUpperCase()}`,
          description: `Loan payment received`,
          metadata: { notes: payment.notes },
        });
      }
    }

    // Sort by date descending
    activities.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate summary
    const totalSales = sales
      .filter(s => s.status !== 'REFUNDED')
      .reduce((sum, s) => sum + Number(s.total), 0);

    const totalPayments = sales
      .flatMap(s => s.payments)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalRefunds = sales
      .filter(s => s.status === 'REFUNDED' || s.status === 'PARTIALLY_REFUNDED')
      .reduce((sum, s) => sum + Number(s.total), 0);

    const totalLoans = loans.reduce((sum, l) => sum + Number(l.principalAmount), 0);

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      activities,
      summary: {
        totalSales,
        totalPayments,
        totalRefunds,
        totalLoans,
        currentDebt: Number(customer.debt),
      },
    };
  }

  async recordPayment(id: string, dto: RecordCustomerPaymentDto) {
    const customer = await this.prisma.customer.findUniqueOrThrow({ where: { id } });

    if (dto.amount > Number(customer.debt)) {
      throw new BadRequestException('Payment amount exceeds outstanding balance');
    }

    const outstandingSales = await this.prisma.sale.findMany({
      where: { customerId: id, amountDue: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
    });

    const outstandingLoans = await this.prisma.loan.findMany({
      where: {
        customerId: id,
        type: 'CUSTOMER_LOAN',
        status: { in: ['ACTIVE', 'OVERDUE'] },
        amountDue: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.prisma.$transaction(async (tx) => {
      let remaining = dto.amount;

      // First, allocate to outstanding sales
      for (const sale of outstandingSales) {
        if (remaining <= 0) break;

        const saleAmountDue = Number(sale.amountDue);
        const allocation = Math.min(remaining, saleAmountDue);
        const newAmountPaid = Number(sale.amountPaid) + allocation;
        const newAmountDue = saleAmountDue - allocation;

        await tx.payment.create({
          data: { saleId: sale.id, method: dto.method as any, amount: allocation },
        });

        await tx.sale.update({
          where: { id: sale.id },
          data: {
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            paymentStatus: (newAmountDue <= 0 ? 'PAID' : 'PARTIALLY_PAID') as any,
          },
        });

        remaining -= allocation;
      }

      // Then, allocate remaining to loans
      for (const loan of outstandingLoans) {
        if (remaining <= 0) break;

        const loanAmountDue = Number(loan.amountDue);
        const allocation = Math.min(remaining, loanAmountDue);
        const newAmountPaid = Number(loan.amountPaid) + allocation;
        const newAmountDue = loanAmountDue - allocation;

        // Create loan payment record
        await tx.loanPayment.create({
          data: {
            loanId: loan.id,
            amount: allocation,
            paymentMethod: dto.method as any,
            notes: 'Payment from customer page',
          },
        });

        // Update loan
        await tx.loan.update({
          where: { id: loan.id },
          data: {
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: newAmountDue <= 0 ? 'COMPLETED' : loan.status,
          },
        });

        remaining -= allocation;
      }

      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: {
          debt: { decrement: dto.amount },
          totalPaid: { increment: dto.amount },
        },
      });

      return {
        id: updatedCustomer.id,
        debt: Number(updatedCustomer.debt),
        totalPaid: Number(updatedCustomer.totalPaid),
      };
    });
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  update(id: string, dto: Partial<CreateCustomerDto>) {
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.customer.delete({ where: { id } });
  }
}
