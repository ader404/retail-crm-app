import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { ExpensesQueryDto } from './dto/expenses-query.dto'
import { PaginatedResult } from '../../common/dto/pagination.dto'

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        userId: dto.userId,
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
      },
      include: { user: true },
    })
  }

  async findAll(queryDto?: ExpensesQueryDto): Promise<PaginatedResult<any>> {
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 20;
    const search = queryDto?.search || '';
    const sortBy = queryDto?.sortBy || 'date';
    const sortOrder = queryDto?.sortOrder || 'desc';

    const skip = (page - 1) * limit;

    const where: any = {};

    // Search filter (on description)
    if (search) {
      where.description = { contains: search };
    }

    // Date range filter
    if (queryDto?.dateFrom || queryDto?.dateTo) {
      where.date = {};
      if (queryDto.dateFrom) where.date.gte = new Date(queryDto.dateFrom);
      if (queryDto.dateTo) where.date.lte = new Date(queryDto.dateTo);
    }

    // Category filter
    if (queryDto?.category) {
      where.category = queryDto.category;
    }

    // User filter
    if (queryDto?.userId) {
      where.userId = queryDto.userId;
    }

    // Amount range filter
    if (queryDto?.minAmount !== undefined || queryDto?.maxAmount !== undefined) {
      where.amount = {};
      if (queryDto.minAmount !== undefined) where.amount.gte = queryDto.minAmount;
      if (queryDto.maxAmount !== undefined) where.amount.lte = queryDto.maxAmount;
    }

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        include: { user: true },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.expense.count({ where }),
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
    const expense = await this.prisma.expense.findUnique({ where: { id }, include: { user: true } })
    if (!expense) throw new NotFoundException('Expense not found')
    return expense
  }

  async update(id: string, dto: Partial<CreateExpenseDto>) {
    await this.findOne(id)
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.date ? { date: new Date(dto.date) } : {}),
      },
      include: { user: true },
    })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.expense.delete({ where: { id } })
  }

  async delete(id: string) {
    return this.remove(id)
  }
}
