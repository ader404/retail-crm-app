import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdjustStockDto } from './dto/inventory.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll() {
    return this.prisma.inventory.findMany({
      include: { product: { include: { category: true, brand: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findLowStock() {
    return this.prisma.inventory.findMany({
      where: { quantity: { lte: this.prisma.inventory.fields.minStock as any } },
      include: { product: true },
    });
  }

  async adjustStock(dto: AdjustStockDto) {
    return this.prisma.inventory.upsert({
      where: { productId: dto.productId },
      create: { productId: dto.productId, quantity: dto.quantity, minStock: dto.minStock ?? 5 },
      update: { quantity: dto.quantity, ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}) },
      include: { product: true },
    });
  }

  async incrementStock(dto: AdjustStockDto) {
    const inventory = await this.prisma.inventory.upsert({
      where: { productId: dto.productId },
      create: { productId: dto.productId, quantity: dto.quantity, minStock: dto.minStock ?? 5 },
      update: { quantity: { increment: dto.quantity }, ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}) },
      include: { product: true },
    });

    if (dto.costPrice !== undefined) {
      await this.prisma.product.update({
        where: { id: dto.productId },
        data: { costPrice: dto.costPrice },
      });
      inventory.product.costPrice = dto.costPrice as any;
    }

    return inventory;
  }
}
