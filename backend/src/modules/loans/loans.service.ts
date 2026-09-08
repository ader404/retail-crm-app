import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateLoanPaymentDto } from './dto/create-loan-payment.dto';
import { LoansQueryDto } from './dto/loans-query.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

const LOAN_INCLUDE = {
  customer: true,
  supplier: true,
  payments: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(queryDto?: LoansQueryDto): Promise<PaginatedResult<any>> {
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 20;
    const search = queryDto?.search || '';
    const sortBy = queryDto?.sortBy || 'createdAt';
    const sortOrder = queryDto?.sortOrder || 'desc';

    const skip = (page - 1) * limit;

    const where: any = {};

    // Search filter (on loan number or reason)
    if (search) {
      where.OR = [
        { loanNumber: { contains: search } },
        { reason: { contains: search } },
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

    // Supplier filter
    if (queryDto?.supplierId) {
      where.supplierId = queryDto.supplierId;
    }

    // Status filter
    if (queryDto?.status) {
      where.status = queryDto.status;
    }

    // Type filter
    if (queryDto?.type) {
      where.type = queryDto.type === 'CUSTOMER' ? 'CUSTOMER_LOAN' : 'SUPPLIER_LOAN';
    }

    // Amount range filter
    if (queryDto?.minAmount !== undefined || queryDto?.maxAmount !== undefined) {
      where.principalAmount = {};
      if (queryDto.minAmount !== undefined) where.principalAmount.gte = queryDto.minAmount;
      if (queryDto.maxAmount !== undefined) where.principalAmount.lte = queryDto.maxAmount;
    }

    const [data, total] = await Promise.all([
      this.prisma.loan.findMany({
        where,
        skip,
        take: limit,
        include: LOAN_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.loan.count({ where }),
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

  async findOne(id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: LOAN_INCLUDE,
    });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  async create(dto: CreateLoanDto) {
    // Validate that either customer or supplier is provided
    if (dto.type === 'CUSTOMER_LOAN' && !dto.customerId) {
      throw new BadRequestException('Customer ID is required for customer loans');
    }
    if (dto.type === 'SUPPLIER_LOAN' && !dto.supplierId) {
      throw new BadRequestException('Supplier ID is required for supplier loans');
    }

    const loanNumber = `LOAN-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          loanNumber,
          type: dto.type as any,
          customerId: dto.customerId ?? null,
          supplierId: dto.supplierId ?? null,
          saleId: dto.saleId ?? null,
          purchaseOrderId: dto.purchaseOrderId ?? null,
          principalAmount: dto.principalAmount,
          amountDue: dto.principalAmount,
          reason: dto.reason,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        },
        include: LOAN_INCLUDE,
      });

      // Update customer or supplier debt
      if (dto.type === 'CUSTOMER_LOAN' && dto.customerId) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { debt: { increment: dto.principalAmount } },
        });
      } else if (dto.type === 'SUPPLIER_LOAN' && dto.supplierId) {
        await tx.supplier.update({
          where: { id: dto.supplierId },
          data: { totalDebt: { increment: dto.principalAmount } },
        });
      }

      return loan;
    });
  }

  async createPayment(dto: CreateLoanPaymentDto) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: dto.loanId },
      include: { sale: true },  // Include linked sale
    });
    if (!loan) throw new NotFoundException('Loan not found');

    if (loan.status === 'COMPLETED') {
      throw new BadRequestException('Loan is already fully paid');
    }
    if (loan.status === 'CANCELLED') {
      throw new BadRequestException('Cannot make payment on cancelled loan');
    }
    if (dto.amount > Number(loan.amountDue)) {
      throw new BadRequestException('Payment amount exceeds remaining balance');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.loanPayment.create({
        data: {
          loanId: dto.loanId,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod as any,
          reference: dto.reference,
          notes: dto.notes,
        },
      });

      const newAmountPaid = Number(loan.amountPaid) + dto.amount;
      const newAmountDue = Number(loan.amountDue) - dto.amount;
      const isFullyPaid = newAmountDue <= 0;

      const updatedLoan = await tx.loan.update({
        where: { id: dto.loanId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: isFullyPaid ? 'COMPLETED' : loan.status,
        },
        include: LOAN_INCLUDE,
      });

      // Update customer or supplier debt
      if (loan.type === 'CUSTOMER_LOAN' && loan.customerId) {
        await tx.customer.update({
          where: { id: loan.customerId },
          data: {
            debt: { decrement: dto.amount },
            totalPaid: { increment: dto.amount },
          },
        });
      } else if (loan.type === 'SUPPLIER_LOAN' && loan.supplierId) {
        await tx.supplier.update({
          where: { id: loan.supplierId },
          data: {
            totalDebt: { decrement: dto.amount },
            totalPaid: { increment: dto.amount },
          },
        });
      }

      // If this loan is linked to a sale, update the sale as well
      if (loan.saleId && loan.sale) {
        const newSaleAmountPaid = Number(loan.sale.amountPaid) + dto.amount;
        const newSaleAmountDue = Number(loan.sale.amountDue) - dto.amount;

        await tx.sale.update({
          where: { id: loan.saleId },
          data: {
            amountPaid: newSaleAmountPaid,
            amountDue: newSaleAmountDue,
            paymentStatus: newSaleAmountDue <= 0 ? 'PAID' : 'PARTIALLY_PAID',
          }
        });

        // Create Payment record for the sale
        await tx.payment.create({
          data: {
            saleId: loan.saleId,
            method: dto.paymentMethod as any,
            amount: dto.amount,
          }
        });
      }

      return { payment, loan: updatedLoan };
    });
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED') {
    const loan = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // If marking as COMPLETED, force the loan to be fully paid
      const updateData: any = { status: status as any };
      if (status === 'COMPLETED' && loan.status !== 'COMPLETED') {
        const remainingDebt = Number(loan.amountDue);
        updateData.amountPaid = loan.principalAmount;
        updateData.amountDue = 0;

        // Adjust customer/supplier debt if there was a remaining balance
        if (remainingDebt > 0) {
          if (loan.type === 'CUSTOMER_LOAN' && loan.customerId) {
            await tx.customer.update({
              where: { id: loan.customerId },
              data: { debt: { decrement: remainingDebt } },
            });
          } else if (loan.type === 'SUPPLIER_LOAN' && loan.supplierId) {
            await tx.supplier.update({
              where: { id: loan.supplierId },
              data: { totalDebt: { decrement: remainingDebt } },
            });
          }
        }

        // If this loan is linked to a sale, force the sale fully paid too
        if (loan.saleId) {
          await tx.sale.update({
            where: { id: loan.saleId },
            data: {
              amountPaid: { increment: remainingDebt },
              amountDue: 0,
              paymentStatus: 'PAID',
            },
          });
        }
      }

      const updatedLoan = await tx.loan.update({
        where: { id },
        data: updateData,
        include: LOAN_INCLUDE,
      });

      // If cancelling a loan, remove the unpaid amount from debt
      if (status === 'CANCELLED' && loan.status !== 'CANCELLED') {
        const unpaidAmount = Number(loan.amountDue);

        if (loan.type === 'CUSTOMER_LOAN' && loan.customerId) {
          await tx.customer.update({
            where: { id: loan.customerId },
            data: { debt: { decrement: unpaidAmount } },
          });
        } else if (loan.type === 'SUPPLIER_LOAN' && loan.supplierId) {
          await tx.supplier.update({
            where: { id: loan.supplierId },
            data: { totalDebt: { decrement: unpaidAmount } },
          });
        }
      }

      // If reactivating a cancelled loan, add the amount back to debt
      if (loan.status === 'CANCELLED' && status !== 'CANCELLED') {
        const unpaidAmount = Number(loan.amountDue);

        if (loan.type === 'CUSTOMER_LOAN' && loan.customerId) {
          await tx.customer.update({
            where: { id: loan.customerId },
            data: { debt: { increment: unpaidAmount } },
          });
        } else if (loan.type === 'SUPPLIER_LOAN' && loan.supplierId) {
          await tx.supplier.update({
            where: { id: loan.supplierId },
            data: { totalDebt: { increment: unpaidAmount } },
          });
        }
      }

      return updatedLoan;
    });
  }

  async getSummary(type?: string) {
    const where: any = {};
    if (type && type !== 'ALL') {
      where.type = type === 'CUSTOMER' ? 'CUSTOMER_LOAN' : 'SUPPLIER_LOAN';
    }

    const loans = await this.prisma.loan.findMany({ where });

    const summary = loans.reduce(
      (acc, loan) => {
        acc.total += Number(loan.principalAmount);
        acc.paid += Number(loan.amountPaid);
        acc.outstanding += Number(loan.amountDue);
        if (loan.status === 'ACTIVE') acc.active++;
        if (loan.status === 'OVERDUE') acc.overdue++;
        if (loan.status === 'COMPLETED') acc.completed++;
        return acc;
      },
      { total: 0, paid: 0, outstanding: 0, active: 0, overdue: 0, completed: 0 }
    );

    return summary;
  }
}
