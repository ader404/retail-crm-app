import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChequeDto } from './dto/create-cheque.dto';
import { UpdateChequeDto } from './dto/update-cheque.dto';
import { ChangeChequeStatusDto } from './dto/change-cheque-status.dto';
import { ChequesQueryDto } from './dto/cheques-query.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';

const CHEQUE_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  supplier: { select: { id: true, companyName: true, contactPerson: true } },
  sale: { select: { id: true, invoiceNumber: true, total: true } },
  purchaseOrder: { select: { id: true, orderNumber: true, total: true } },
  creator: { select: { id: true, name: true } },
  statusHistory: {
    include: { changer: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['DEPOSITED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'RETURNED', 'CANCELLED'],
  DEPOSITED: ['PRESENTED', 'CLEARED', 'BOUNCED', 'RETURNED'],
  PRESENTED: ['CLEARED', 'BOUNCED', 'RETURNED'],
  CLEARED: [],
  BOUNCED: [],
  RETURNED: [],
  CANCELLED: [],
};

@Injectable()
export class ChequesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(queryDto?: ChequesQueryDto): Promise<PaginatedResult<any>> {
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 20;
    const search = queryDto?.search || '';
    const sortBy = queryDto?.sortBy || 'createdAt';
    const sortOrder = queryDto?.sortOrder || 'desc';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { chequeNumber: { contains: search } },
        { partyName: { contains: search } },
        { bankName: { contains: search } },
        { customer: { name: { contains: search } } },
        { supplier: { companyName: { contains: search } } },
      ];
    }

    if (queryDto?.dateFrom || queryDto?.dateTo) {
      where.createdAt = {};
      if (queryDto.dateFrom) where.createdAt.gte = new Date(queryDto.dateFrom);
      if (queryDto.dateTo) where.createdAt.lte = new Date(queryDto.dateTo);
    }

    if (queryDto?.dueDateFrom || queryDto?.dueDateTo) {
      where.dueDate = {};
      if (queryDto.dueDateFrom) where.dueDate.gte = new Date(queryDto.dueDateFrom);
      if (queryDto.dueDateTo) where.dueDate.lte = new Date(queryDto.dueDateTo);
    }

    if (queryDto?.type) where.type = queryDto.type;
    if (queryDto?.status) where.status = queryDto.status;
    if (queryDto?.customerId) where.customerId = queryDto.customerId;
    if (queryDto?.supplierId) where.supplierId = queryDto.supplierId;
    if (queryDto?.bankName) where.bankName = { contains: queryDto.bankName };

    const [data, total] = await Promise.all([
      this.prisma.cheque.findMany({
        where,
        skip,
        take: limit,
        include: CHEQUE_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.cheque.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(cheque => ({
        ...cheque,
        amount: Number(cheque.amount),
      })),
      meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
    };
  }

  async findOne(id: string) {
    const cheque = await this.prisma.cheque.findUnique({ where: { id }, include: CHEQUE_INCLUDE });
    if (!cheque) throw new NotFoundException('Cheque not found');
    return { ...cheque, amount: Number(cheque.amount) };
  }

  async create(dto: CreateChequeDto) {
    if (dto.customerId && dto.supplierId) {
      throw new BadRequestException('A cheque cannot be linked to both a customer and a supplier');
    }

    const cheque = await this.prisma.cheque.create({
      data: {
        chequeNumber: dto.chequeNumber,
        type: dto.type as any,
        amount: dto.amount,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        dueDate: new Date(dto.dueDate),
        bankName: dto.bankName || null,
        accountReference: dto.accountReference || null,
        status: 'PENDING',
        partyName: dto.partyName || null,
        customerId: dto.customerId || null,
        supplierId: dto.supplierId || null,
        saleId: dto.saleId || null,
        purchaseOrderId: dto.purchaseOrderId || null,
        notes: dto.notes || null,
        createdBy: dto.userId,
        statusHistory: {
          create: {
            previousStatus: null,
            newStatus: 'PENDING',
            changedBy: dto.userId,
            notes: 'Cheque created',
          },
        },
      },
      include: CHEQUE_INCLUDE,
    });

    return { ...cheque, amount: Number(cheque.amount) };
  }

  async update(id: string, dto: UpdateChequeDto, userId: string) {
    const existing = await this.findOne(id);

    if (existing.status === 'CLEARED' || existing.status === 'BOUNCED' || existing.status === 'RETURNED' || existing.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot edit a cheque with status "${existing.status}". Only pending, deposited, or presented cheques can be modified.`);
    }

    const cheque = await this.prisma.cheque.update({
      where: { id },
      data: {
        ...(dto.chequeNumber !== undefined && { chequeNumber: dto.chequeNumber }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.issueDate !== undefined && { issueDate: dto.issueDate ? new Date(dto.issueDate) : null }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.accountReference !== undefined && { accountReference: dto.accountReference }),
        ...(dto.partyName !== undefined && { partyName: dto.partyName }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId }),
        ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
        ...(dto.saleId !== undefined && { saleId: dto.saleId }),
        ...(dto.purchaseOrderId !== undefined && { purchaseOrderId: dto.purchaseOrderId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: CHEQUE_INCLUDE,
    });

    return { ...cheque, amount: Number(cheque.amount) };
  }

  async changeStatus(id: string, dto: ChangeChequeStatusDto, userId: string) {
    const existing = await this.findOne(id);

    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot change status from "${existing.status}" to "${dto.status}". Allowed transitions: ${allowed.join(', ') || 'none'}`,
      );
    }

    const previousStatus = existing.status;

    const cheque = await this.prisma.cheque.update({
      where: { id },
      data: {
        status: dto.status as any,
        ...(dto.status === 'CLEARED' && { clearedAt: new Date() }),
        statusHistory: {
          create: {
            previousStatus,
            newStatus: dto.status as any,
            changedBy: userId,
            notes: dto.notes || null,
          },
        },
      },
      include: CHEQUE_INCLUDE,
    });

    const typeLabel = cheque.type === 'INCOMING' ? 'incoming' : 'outgoing';
    this.notifications.add(
      'cheque',
      `Cheque ${cheque.chequeNumber} (${typeLabel}) status changed to ${dto.status}`,
      {
        entityType: 'cheque',
        entityId: cheque.id,
        targetRoute: '/cheques',
      },
    );

    return { ...cheque, amount: Number(cheque.amount) };
  }

  async getSummary() {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const [
      totalIncomingActive,
      totalOutgoingActive,
      dueSoon,
      overdue,
      countIncomingActive,
      countOutgoingActive,
      countDueSoon,
      countOverdue,
    ] = await Promise.all([
      this.prisma.cheque.aggregate({
        where: { type: 'INCOMING', status: { notIn: ['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'] } },
        _sum: { amount: true },
      }),
      this.prisma.cheque.aggregate({
        where: { type: 'OUTGOING', status: { notIn: ['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'] } },
        _sum: { amount: true },
      }),
      this.prisma.cheque.aggregate({
        where: {
          status: { notIn: ['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'] },
          dueDate: { gte: now, lte: sevenDaysFromNow },
        },
        _sum: { amount: true },
      }),
      this.prisma.cheque.aggregate({
        where: {
          status: { notIn: ['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'] },
          dueDate: { lt: now },
        },
        _sum: { amount: true },
      }),
      this.prisma.cheque.count({
        where: { type: 'INCOMING', status: { notIn: ['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'] } },
      }),
      this.prisma.cheque.count({
        where: { type: 'OUTGOING', status: { notIn: ['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'] } },
      }),
      this.prisma.cheque.count({
        where: {
          status: { notIn: ['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'] },
          dueDate: { gte: now, lte: sevenDaysFromNow },
        },
      }),
      this.prisma.cheque.count({
        where: {
          status: { notIn: ['CLEARED', 'CANCELLED', 'BOUNCED', 'RETURNED'] },
          dueDate: { lt: now },
        },
      }),
    ]);

    return {
      toReceive: { total: Number(totalIncomingActive._sum.amount || 0), count: countIncomingActive },
      toPay: { total: Number(totalOutgoingActive._sum.amount || 0), count: countOutgoingActive },
      dueSoon: { total: Number(dueSoon._sum.amount || 0), count: countDueSoon },
      overdue: { total: Number(overdue._sum.amount || 0), count: countOverdue },
    };
  }

  async remove(id: string) {
    const existing = await this.findOne(id);

    if (existing.status === 'CLEARED') {
      throw new BadRequestException('Cannot delete a cleared cheque. Financial records have been posted.');
    }

    await this.prisma.cheque.delete({ where: { id } });
    return { success: true };
  }
}
