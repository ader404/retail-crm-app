import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(supplierId?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: supplierId ? { supplierId } : undefined,
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });

    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async create(dto: CreatePurchaseOrderDto) {
    const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const subtotal = dto.items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
    const total = subtotal + (dto.tax || 0);
    const amountPaid = dto.amountPaid || 0;
    const amountDue = total - amountPaid;

    let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
    if (amountPaid >= total) {
      paymentStatus = 'PAID';
    } else if (amountPaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    } else {
      paymentStatus = 'UNPAID';
    }

    return this.prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: dto.supplierId,
          subtotal,
          tax: dto.tax || 0,
          total,
          amountPaid,
          amountDue,
          paymentStatus,
          expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : undefined,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              costPrice: item.costPrice,
            })),
          },
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Update supplier balances
      await tx.supplier.update({
        where: { id: dto.supplierId },
        data: {
          totalDebt: { increment: amountDue },
          totalPaid: { increment: amountPaid },
        },
      });

      // Create payment record if amount paid
      if (amountPaid > 0) {
        await tx.supplierPayment.create({
          data: {
            supplierId: dto.supplierId,
            purchaseOrderId: purchaseOrder.id,
            amount: amountPaid,
            paymentMethod: 'CASH',
            notes: 'Initial payment on purchase order',
          },
        });
      }

      return purchaseOrder;
    });
  }

  async receive(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!po) throw new NotFoundException('Purchase order not found');

    return this.prisma.$transaction(async (tx) => {
      // Update all items to received
      for (const item of po.items) {
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQty: item.quantity },
        });

        // Update inventory
        await tx.inventory.upsert({
          where: { productId: item.productId },
          create: {
            productId: item.productId,
            quantity: item.quantity,
            minStock: 5,
          },
          update: {
            quantity: { increment: item.quantity },
          },
        });

        // Activate the product
        await tx.product.update({
          where: { id: item.productId },
          data: { isActive: true },
        });
      }

      // Update PO status
      return tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECEIVED' },
        include: {
          supplier: true,
          items: {
            include: { product: true },
          },
        },
      });
    });
  }

  async cancel(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async updatePaymentStatus(id: string, status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID') {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { paymentStatus: status },
    });
  }
}
