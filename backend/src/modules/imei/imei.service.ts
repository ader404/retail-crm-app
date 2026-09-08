import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ImeiService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: string) {
    return this.prisma.imeiDevice.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAvailable(productId: string) {
    return this.prisma.imeiDevice.findMany({
      where: { productId, status: 'AVAILABLE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async register(productId: string, imeis: string[]) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.trackImei) throw new BadRequestException('IMEI tracking is not enabled for this product');

    const results: any[] = [];
    const errors: string[] = [];

    for (const rawImei of imeis) {
      const imei = rawImei.trim();
      if (!imei) continue;
      if (!/^\d{15}$/.test(imei)) {
        errors.push(`"${imei}" is not a valid 15-digit IMEI`);
        continue;
      }
      const existing = await this.prisma.imeiDevice.findUnique({ where: { imei } });
      if (existing) {
        errors.push(`IMEI "${imei}" already exists`);
        continue;
      }
      const device = await this.prisma.imeiDevice.create({
        data: { productId, imei },
      });
      results.push(device);
    }

    // Each IMEI = 1 unit of stock. Keep inventory in sync with the number of
    // available devices so normal inventory-driven logic (POS stock checks,
    // low-stock alerts, reports) stays correct for IMEI-tracked products.
    if (results.length > 0) {
      await this.prisma.inventory.upsert({
        where: { productId },
        create: { productId, quantity: results.length },
        update: { quantity: { increment: results.length } },
      });
    }

    return { created: results, errors };
  }

  async remove(id: string) {
    const device = await this.prisma.imeiDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('IMEI device not found');
    if (device.status !== 'AVAILABLE') throw new BadRequestException('Cannot delete a device that is not available');
    await this.prisma.imeiDevice.delete({ where: { id } });

    // Removing an available device removes one unit of stock.
    const inventory = await this.prisma.inventory.findUnique({ where: { productId: device.productId } });
    if (inventory && inventory.quantity > 0) {
      await this.prisma.inventory.update({
        where: { productId: device.productId },
        data: { quantity: { decrement: 1 } },
      });
    }

    return { success: true };
  }

  async search(query: string) {
    const devices = await this.prisma.imeiDevice.findMany({
      where: { imei: { contains: query } },
      include: { product: { select: { id: true, name: true, sku: true } } },
      take: 20,
    });
    return devices;
  }

  async getStats(productId: string) {
    const [total, available, sold, returned] = await Promise.all([
      this.prisma.imeiDevice.count({ where: { productId } }),
      this.prisma.imeiDevice.count({ where: { productId, status: 'AVAILABLE' } }),
      this.prisma.imeiDevice.count({ where: { productId, status: 'SOLD' } }),
      this.prisma.imeiDevice.count({ where: { productId, status: 'RETURNED' } }),
    ]);
    return { total, available, sold, returned };
  }

  async markAsSold(deviceIds: string[], saleId: string) {
    await this.prisma.imeiDevice.updateMany({
      where: { id: { in: deviceIds }, status: 'AVAILABLE' },
      data: { status: 'SOLD', saleId },
    });
  }

  async markAsReturned(deviceIds: string[]) {
    // A returned device is physically back in stock, so it becomes sellable
    // again (AVAILABLE). The sale refund already increments inventory, keeping
    // "1 IMEI = 1 quantity" consistent.
    await this.prisma.imeiDevice.updateMany({
      where: { id: { in: deviceIds } },
      data: { status: 'AVAILABLE', saleId: null },
    });
  }

  async validateUniqueness(imeis: string[]) {
    const trimmed = imeis.map(i => i.trim()).filter(Boolean);
    const existing = await this.prisma.imeiDevice.findMany({
      where: { imei: { in: trimmed } },
      select: { imei: true },
    });
    return {
      duplicates: existing.map(e => e.imei),
      valid: trimmed.filter(i => !existing.some(e => e.imei === i)),
    };
  }
}
