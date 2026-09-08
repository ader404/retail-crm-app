import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(paginationDto?: PaginationDto): Promise<PaginatedResult<any>> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 10;
    const search = paginationDto?.search || '';
    const sortBy = paginationDto?.sortBy || 'companyName';
    const sortOrder = paginationDto?.sortOrder || 'asc';

    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { companyName: { contains: search } },
            { contactPerson: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { products: true, purchaseOrders: true } } },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(supplier => ({
        ...supplier,
        totalDebt: Number(supplier.totalDebt),
        totalPaid: Number(supplier.totalPaid),
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
    const supplier = await this.prisma.supplier.findUniqueOrThrow({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          select: { id: true, name: true, sku: true, costPrice: true, sellingPrice: true }
        },
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { items: { include: { product: { select: { name: true } } } } }
        },
        supplierPayments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        loans: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Get stock levels for products
    const productIds = supplier.products.map(p => p.id);
    const stockLevels = productIds.length > 0
      ? await this.prisma.inventory.groupBy({
          by: ['productId'],
          where: { productId: { in: productIds } },
          _sum: { quantity: true },
        })
      : [];

    const stockMap = Object.fromEntries(
      stockLevels.map(s => [s.productId, Number(s._sum.quantity ?? 0)])
    );

    // Transform data to match frontend expectations
    return {
      id: supplier.id,
      name: supplier.companyName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      totalDebt: Number(supplier.totalDebt),
      totalPaid: Number(supplier.totalPaid),
      createdAt: supplier.createdAt,
      products: supplier.products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: stockMap[p.id] ?? 0,
        price: Number(p.sellingPrice),
        cost: Number(p.costPrice),
      })),
      purchaseOrders: supplier.purchaseOrders.map(po => ({
        id: po.id,
        orderNumber: po.orderNumber,
        total: Number(po.total),
        amountPaid: Number(po.amountPaid),
        amountDue: Number(po.amountDue),
        paymentStatus: po.paymentStatus,
        status: po.status,
        createdAt: po.createdAt,
        items: po.items.map(item => ({
          id: item.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.costPrice),
        })),
      })),
      payments: supplier.supplierPayments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        notes: p.notes,
        createdAt: p.createdAt,
      })),
      loans: supplier.loans.map(loan => ({
        id: loan.id,
        amount: Number(loan.principalAmount),
        amountPaid: Number(loan.amountPaid),
        balance: Number(loan.principalAmount) - Number(loan.amountPaid),
        status: loan.status,
        dueDate: loan.dueDate,
        createdAt: loan.createdAt,
      })),
    };
  }

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  update(id: string, dto: Partial<CreateSupplierDto>) {
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.supplier.delete({ where: { id } });
  }

  async createPayment(dto: CreateSupplierPaymentDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.create({
        data: {
          supplierId: dto.supplierId,
          purchaseOrderId: dto.purchaseOrderId ?? null,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod as any,
          reference: dto.reference,
          notes: dto.notes,
        },
      });

      // Update supplier balances
      await tx.supplier.update({
        where: { id: dto.supplierId },
        data: {
          totalPaid: { increment: dto.amount },
          totalDebt: { decrement: dto.amount },
        },
      });

      // If linked to a purchase order, update that too
      if (dto.purchaseOrderId) {
        const po = await tx.purchaseOrder.findUnique({ where: { id: dto.purchaseOrderId } });
        if (po) {
          const newAmountPaid = Number(po.amountPaid) + dto.amount;
          const newAmountDue = Number(po.amountDue) - dto.amount;
          const paymentStatus = newAmountDue <= 0 ? 'PAID' : newAmountDue < Number(po.total) ? 'PARTIALLY_PAID' : 'UNPAID';

          await tx.purchaseOrder.update({
            where: { id: dto.purchaseOrderId },
            data: {
              amountPaid: newAmountPaid,
              amountDue: newAmountDue,
              paymentStatus: paymentStatus as any,
            },
          });
        }
      }

      return payment;
    });
  }

  async getSupplierLedger(id: string, startDate?: Date, endDate?: Date) {
    const supplier = await this.prisma.supplier.findUniqueOrThrow({ where: { id } });

    const dateFilter = startDate && endDate
      ? { createdAt: { gte: startDate, lte: endDate } }
      : {};

    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId: id, ...dateFilter },
      include: {
        items: { include: { product: true } },
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

    for (const po of purchaseOrders) {
      // Add purchase order entry
      ledgerEntries.push({
        date: po.createdAt,
        type: 'PURCHASE_ORDER',
        reference: po.orderNumber,
        description: `Purchase Order - ${po.items.length} items`,
        debit: Number(po.total),
        credit: 0,
        balance: runningBalance + Number(po.total),
      });
      runningBalance += Number(po.total);

      // Add payment entries
      for (const payment of po.payments) {
        ledgerEntries.push({
          date: payment.createdAt,
          type: 'PAYMENT',
          reference: po.orderNumber,
          description: `Payment - ${payment.paymentMethod}`,
          debit: 0,
          credit: Number(payment.amount),
          balance: runningBalance - Number(payment.amount),
        });
        runningBalance -= Number(payment.amount);
      }
    }

    // Transform to match frontend expectations
    return {
      supplier: {
        id: supplier.id,
        name: supplier.companyName,
        phone: supplier.phone,
        email: supplier.email,
      },
      entries: ledgerEntries,
      openingBalance: 0,
      closingBalance: runningBalance,
      totalDebits: ledgerEntries.reduce((sum, e) => sum + e.debit, 0),
      totalCredits: ledgerEntries.reduce((sum, e) => sum + e.credit, 0),
    };
  }

  async getSupplierHistory(id: string, startDate?: Date, endDate?: Date) {
    const supplier = await this.prisma.supplier.findUniqueOrThrow({ where: { id } });

    const dateFilter = startDate && endDate
      ? { createdAt: { gte: startDate, lte: endDate } }
      : {};

    // Fetch all related data
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId: id, ...dateFilter },
      include: {
        payments: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const loans = await this.prisma.loan.findMany({
      where: { supplierId: id, type: 'SUPPLIER_LOAN', ...dateFilter },
      include: { payments: true },
      orderBy: { createdAt: 'desc' },
    });

    // Build activity timeline
    const activities: Array<{
      id: string;
      type: 'PURCHASE_ORDER' | 'PAYMENT' | 'LOAN_CREATED' | 'LOAN_PAYMENT';
      date: Date;
      amount: number;
      reference: string;
      description: string;
      status?: string;
      metadata?: any;
    }> = [];

    // Add purchase orders
    for (const po of purchaseOrders) {
      activities.push({
        id: po.id,
        type: 'PURCHASE_ORDER',
        date: po.createdAt,
        amount: Number(po.total),
        reference: po.orderNumber,
        description: `Purchase Order - ${po.items?.length || 0} items`,
        status: po.paymentStatus,
        metadata: { itemCount: po.items?.length || 0, poStatus: po.status },
      });

      // Add payments for this purchase order
      for (const payment of po.payments) {
        activities.push({
          id: payment.id,
          type: 'PAYMENT',
          date: payment.createdAt,
          amount: Number(payment.amount),
          reference: po.orderNumber,
          description: `Payment sent - ${payment.paymentMethod}`,
          metadata: { method: payment.paymentMethod },
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
    const totalPurchases = purchaseOrders.reduce((sum, po) => sum + Number(po.total), 0);

    const totalPayments = purchaseOrders
      .flatMap(po => po.payments)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalLoans = loans.reduce((sum, l) => sum + Number(l.principalAmount), 0);

    return {
      supplier: {
        id: supplier.id,
        name: supplier.companyName,
        phone: supplier.phone,
        email: supplier.email,
      },
      activities,
      summary: {
        totalPurchases,
        totalPayments,
        totalLoans,
        currentDebt: Number(supplier.totalDebt),
      },
    };
  }
}
