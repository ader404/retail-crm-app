import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { SalesQueryDto } from './dto/sales-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ImeiService } from '../imei/imei.service';
import { PaginatedResult } from '../../common/dto/pagination.dto';

const SALE_INCLUDE = {
  customer: true,
  user: { select: { id: true, name: true, email: true } },
  items: { include: { product: { include: { category: true } }, imeiDevice: true } },
  payments: true,
  loan: true,  // NEW: Include linked loan for partial-payment sales
};

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly imeiService: ImeiService,
  ) {}

  async findAll(queryDto?: SalesQueryDto): Promise<PaginatedResult<any>> {
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 20;
    const search = queryDto?.search || '';
    const sortBy = queryDto?.sortBy || 'createdAt';
    const sortOrder = queryDto?.sortOrder || 'desc';

    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,  // Exclude soft-deleted sales
    };

    // Search filter
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    // Date range filter
    if (queryDto?.dateFrom || queryDto?.dateTo) {
      where.createdAt = {};
      if (queryDto.dateFrom) where.createdAt.gte = new Date(queryDto.dateFrom);
      if (queryDto.dateTo) where.createdAt.lte = new Date(queryDto.dateTo);
    }

    // Customer filter
    if (queryDto?.customerId) {
      where.customerId = queryDto.customerId;
    }

    // Payment status filter
    if (queryDto?.paymentStatus) {
      where.paymentStatus = queryDto.paymentStatus;
    }

    // Sale status filter
    if (queryDto?.status) {
      where.status = queryDto.status;
    }

    // Payment method filter
    if (queryDto?.paymentMethod) {
      where.paymentMethod = queryDto.paymentMethod;
    }

    // User/cashier filter
    if (queryDto?.userId) {
      where.userId = queryDto.userId;
    }

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        include: SALE_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.sale.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(sale => ({
        ...sale,
        total: Number(sale.total),
        subtotal: Number(sale.subtotal),
        discount: Number(sale.discount),
        tax: Number(sale.tax),
        amountPaid: Number(sale.amountPaid),
        amountDue: Number(sale.amountDue),
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

  findOne(id: string) {
    return this.prisma.sale.findUniqueOrThrow({ where: { id }, include: SALE_INCLUDE });
  }

  async create(dto: CreateSaleDto) {
    const lowStockAlerts: string[] = [];
    let invoiceNumberForNotify = '';
    let totalForNotify = 0;

    const sale = await this.prisma.$transaction(async (tx) => {
      const subtotal = dto.items.reduce((sum, i) => sum + (i.sellingPrice - (i.discount ?? 0)) * i.quantity, 0);
      const discount = dto.discount ?? 0;
      const discountType = (dto.discountType as any) || 'PERCENTAGE';
      const tax = dto.tax ?? 0;

      // Calculate total based on discount type
      let total: number;
      if (discountType === 'FIXED_AMOUNT') {
        total = subtotal - discount + tax;
      } else {
        // PERCENTAGE
        total = subtotal - (subtotal * discount / 100) + tax;
      }

      // amountPaid must never exceed the sale total — any cash the customer
      // hands over beyond the total is simply "change" returned to them and is
      // NOT revenue. Cap it so amountDue never goes negative and revenue/payment
      // records reflect only the actual sale value.
      const rawAmountPaid = dto.amountPaid ?? total;
      const amountPaid = Math.min(rawAmountPaid, total);
      const amountDue = total - amountPaid;

      // Determine payment status
      let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
      if (amountPaid >= total) {
        paymentStatus = 'PAID';
      } else if (amountPaid > 0) {
        paymentStatus = 'PARTIALLY_PAID';
      } else {
        paymentStatus = 'UNPAID';
      }

      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: dto.customerId ?? null,
          userId: dto.userId,
          paymentMethod: dto.paymentMethod as any,
          subtotal,
          discount,
          discountType: discountType as any,
          tax,
          total,
          amountPaid,
          amountDue,
          paymentStatus: paymentStatus as any,
          notes: dto.notes,
          items: {
            create: dto.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              costPrice: i.costPrice,
              sellingPrice: i.sellingPrice,
              discount: i.discount ?? 0,
              total: (i.sellingPrice - (i.discount ?? 0)) * i.quantity,
              imeiDeviceId: (i as any).imeiDeviceIds?.[0] ?? null,
            })),
          },
          payments: amountPaid > 0 ? {
            create: [{ method: dto.paymentMethod as any, amount: amountPaid }],
          } : undefined,
        },
        include: SALE_INCLUDE,
      });

      // Deduct inventory with atomic check (prevents race condition)
      const updatedInventories = await Promise.all(
        dto.items.map(async (item) => {
          const updated = await tx.inventory.updateMany({
            where: {
              productId: item.productId,
              quantity: { gte: item.quantity } // Only update if quantity is sufficient
            },
            data: { quantity: { decrement: item.quantity } },
          });

          // If no rows updated, stock was insufficient
          if (updated.count === 0) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            throw new BadRequestException(`Insufficient stock for "${product?.name ?? item.productId}"`);
          }

          // Fetch updated inventory for low stock check
          return tx.inventory.findUnique({
            where: { productId: item.productId },
            include: { product: true },
          });
        }),
      );

      for (const inventory of updatedInventories) {
        if (inventory && inventory.quantity <= inventory.minStock) {
          lowStockAlerts.push(inventory.product.name);
        }
      }

      // Create loan for partial payment (if customer exists and amount is due)
      if (dto.customerId && amountDue > 0) {
        const loanNumber = `LOAN-SALE-${invoiceNumber}`;

        // Create the loan linked to this sale
        await tx.loan.create({
          data: {
            loanNumber,
            type: 'CUSTOMER_LOAN',
            customerId: dto.customerId,
            saleId: sale.id,
            principalAmount: amountDue,
            amountDue: amountDue,
            reason: `Partial payment for sale ${invoiceNumber}`,
            status: 'ACTIVE',
          }
        });

        // Increment customer debt (Loan creation does NOT auto-increment, we do it manually)
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { debt: { increment: amountDue } },
        });
      }

      invoiceNumberForNotify = invoiceNumber;
      totalForNotify = total;

      return sale;
    }, { timeout: 15000 });

    // Mark IMEI devices as sold (outside transaction to avoid lock contention)
    const imeiDeviceIds = dto.items
      .flatMap(i => (i as any).imeiDeviceIds ?? [])
      .filter(Boolean);
    if (imeiDeviceIds.length > 0) {
      await this.imeiService.markAsSold(imeiDeviceIds, sale.id);
    }

    this.notifications.add('sale', `New sale ${invoiceNumberForNotify} for ${totalForNotify.toFixed(2)} DH`, {
      entityType: 'sale',
      entityId: sale.id,
      targetRoute: '/sales',
    });
    for (const productName of lowStockAlerts) {
      this.notifications.add('low_stock', `Low stock alert: "${productName}" is running low`);
    }

    return sale;
  }

  async refund(id: string) {
    const sale = await this.prisma.sale.findUniqueOrThrow({
      where: { id },
      include: { items: true, loan: true, customer: true },
    });
    if (sale.status === 'REFUNDED') throw new BadRequestException('Sale already refunded');

    // Mark IMEI devices as returned (outside transaction)
    const linkedImeiDevices = await this.prisma.imeiDevice.findMany({
      where: { saleId: id },
      select: { id: true },
    });
    const imeiDeviceIds = linkedImeiDevices.map(d => d.id);
    if (imeiDeviceIds.length > 0) {
      await this.imeiService.markAsReturned(imeiDeviceIds);
    }

    return this.prisma.$transaction(async (tx) => {
      // Restore inventory
      for (const item of sale.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      // If there's a linked loan, cancel it and reverse customer debt
      if (sale.loan && sale.loan.status !== 'CANCELLED' && sale.loan.status !== 'COMPLETED') {
        // Reverse only the CURRENTLY OUTSTANDING balance, not the original principal.
        // If partial debt payments were already made, principalAmount would over-subtract.
        const outstandingBalance = Number(sale.loan.amountDue);

        await tx.loan.update({
          where: { id: sale.loan.id },
          data: { status: 'CANCELLED' },
        });

        if (sale.customerId && outstandingBalance > 0) {
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { debt: { decrement: outstandingBalance } },
          });
        }
      }

      // Update sale status and zero out outstanding balance (no longer collectible)
      const updated = await tx.sale.update({
        where: { id },
        data: {
          status: 'REFUNDED',
          amountDue: 0,
        },
        include: SALE_INCLUDE,
      });

      return updated;
    }).then((updated) => {
      this.notifications.add('refund', `Sale ${updated.invoiceNumber} was refunded`, {
        entityType: 'sale',
        entityId: updated.id,
        targetRoute: '/sales',
      });
      return updated;
    });
  }

  async addPayment(dto: AddPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      // Read balances INSIDE the transaction so concurrent payments serialize
      // on the row lock instead of computing from a stale snapshot.
      const sale = await tx.sale.findUniqueOrThrow({
        where: { id: dto.saleId },
        include: { loan: true },
      });

      if (sale.paymentStatus === 'PAID') {
        throw new BadRequestException('Sale is already fully paid');
      }

      const newAmountPaid = Number(sale.amountPaid) + dto.amount;
      const newAmountDue = Number(sale.amountDue) - dto.amount;

      if (newAmountDue < 0) {
        throw new BadRequestException('Payment amount exceeds remaining balance');
      }

      // Create payment record
      await tx.payment.create({
        data: {
          saleId: dto.saleId,
          method: dto.method as any,
          amount: dto.amount,
        },
      });

      // Optimistic concurrency check: only update if amountPaid is unchanged
      const updatedCount = await tx.sale.updateMany({
        where: { id: dto.saleId, amountPaid: sale.amountPaid },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          paymentStatus: (newAmountDue <= 0 ? 'PAID' : 'PARTIALLY_PAID') as any,
        },
      });

      if (updatedCount.count === 0) {
        throw new ConflictException(
          'Sale was modified concurrently, please retry',
        );
      }

      const updatedSale = await tx.sale.findUniqueOrThrow({
        where: { id: dto.saleId },
        include: SALE_INCLUDE,
      });

      // Update customer debt
      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            debt: { decrement: dto.amount },
            totalPaid: { increment: dto.amount },
          },
        });
      }

      // If this sale has a linked loan, update the loan as well
      if (sale.loan) {
        const newLoanAmountPaid = Number(sale.loan.amountPaid) + dto.amount;
        const newLoanAmountDue = Number(sale.loan.amountDue) - dto.amount;

        await tx.loan.updateMany({
          where: { id: sale.loan.id, amountPaid: sale.loan.amountPaid },
          data: {
            amountPaid: newLoanAmountPaid,
            amountDue: newLoanAmountDue,
            status: (newLoanAmountDue <= 0 ? 'COMPLETED' : 'ACTIVE') as any,
          }
        });

        // Create LoanPayment record
        await tx.loanPayment.create({
          data: {
            loanId: sale.loan.id,
            amount: dto.amount,
            paymentMethod: dto.method as any,
          }
        });
      }

      return updatedSale;
    });
  }

  async updatePaymentStatus(id: string, status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID') {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: { payments: true } });
    if (!sale) throw new BadRequestException('Sale not found');

    // Prevent changing status if there are recorded payments
    if (sale.payments && sale.payments.length > 0 && status !== sale.paymentStatus) {
      throw new BadRequestException('Cannot change payment status for a sale with recorded payments. Use the payment recording feature instead.');
    }

    return this.prisma.$transaction(async (tx) => {
      let updateData: any = { paymentStatus: status as any };
      const currentAmountPaid = Number(sale.amountPaid);
      const total = Number(sale.total);
      const currentAmountDue = Number(sale.amountDue);

      // Adjust amounts and customer debt based on status change
      if (status === 'PAID' && sale.paymentStatus !== 'PAID') {
        // Mark as fully paid
        const additionalPayment = total - currentAmountPaid;
        updateData.amountPaid = total;
        updateData.amountDue = 0;

        // Update customer debt if customer exists and there's outstanding debt
        if (sale.customerId && currentAmountDue > 0) {
          await tx.customer.update({
            where: { id: sale.customerId },
            data: {
              debt: { decrement: currentAmountDue },
              totalPaid: { increment: additionalPayment },
            },
          });
        }
      } else if (status === 'UNPAID' && sale.paymentStatus !== 'UNPAID') {
        // Mark as unpaid
        updateData.amountPaid = 0;
        updateData.amountDue = total;

        // Update customer debt if customer exists
        if (sale.customerId) {
          const debtChange = total - currentAmountDue;
          const customerUpdateData: any = {};

          if (debtChange !== 0) {
            customerUpdateData.debt = { increment: debtChange };
          }
          if (currentAmountPaid > 0) {
            customerUpdateData.totalPaid = { decrement: currentAmountPaid };
          }

          if (Object.keys(customerUpdateData).length > 0) {
            await tx.customer.update({
              where: { id: sale.customerId },
              data: customerUpdateData,
            });
          }
        }
      }

      return tx.sale.update({
        where: { id },
        data: updateData,
        include: SALE_INCLUDE,
      });
    });
  }

  async delete(id: string) {
    // First refund the sale (restores inventory, cancels loan, reverses debt)
    await this.refund(id);

    // Then soft-delete by setting deletedAt
    return this.prisma.sale.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: SALE_INCLUDE,
    });
  }

  async findDeleted(queryDto?: SalesQueryDto): Promise<PaginatedResult<any>> {
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: { not: null },
    };

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        include: SALE_INCLUDE,
        orderBy: { deletedAt: 'desc' },
      }),
      this.prisma.sale.count({ where }),
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

  async restore(id: string) {
    const sale = await this.prisma.sale.findUnique({ where: { id } });
    if (!sale) throw new BadRequestException('Sale not found');
    if (!sale.deletedAt) throw new BadRequestException('Sale is not deleted');

    return this.prisma.sale.update({
      where: { id },
      data: { deletedAt: null },
      include: SALE_INCLUDE,
    });
  }
}
