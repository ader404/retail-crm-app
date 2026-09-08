import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateCategoryDto, CreateBrandDto } from './dto/create-category.dto';
import { BulkProductPurchaseDto } from './dto/bulk-product-purchase.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

const PRODUCT_INCLUDE = {
  category: true,
  brand: true,
  supplier: true,
  inventory: true,
  image: { select: { id: true } }, // just check existence, never load binary data here
  _count: {
    select: {
      imeiDevices: {
        where: { status: 'AVAILABLE' }
      }
    }
  }
};

// Attaches a lightweight imageUrl reference (never the binary data) to a product
// returned from the API. Actual bytes are only served via GET /products/:id/image.
function withImageUrl<T extends { id: string; image?: { id: string } | null }>(product: T) {
  const { image, ...rest } = product as any;
  // Relative to the API base (e.g. axios baseURL already ends in /api) —
  // deliberately NOT prefixed with /api here.
  return { ...rest, imageUrl: image ? `/products/${product.id}/image` : null };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(paginationDto?: PaginationDto): Promise<PaginatedResult<any>> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 20;
    const search = paginationDto?.search || '';
    const sortBy = paginationDto?.sortBy || 'createdAt';
    const sortOrder = paginationDto?.sortOrder || 'desc';

    const skip = (page - 1) * limit;

    const where = search
      ? {
          isActive: true,
          OR: [
            { name: { contains: search } },
            { sku: { contains: search } },
            { barcode: { contains: search } },
            ...(/^\d+$/.test(search)
              ? [{ imeiDevices: { some: { imei: { contains: search } } } }]
              : []),
          ],
        }
      : { isActive: true };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(product => withImageUrl({
        ...product,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
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
    const product = await this.prisma.product.findUniqueOrThrow({ where: { id }, include: PRODUCT_INCLUDE });
    return withImageUrl(product);
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: { category: true, brand: true, image: { select: { id: true } } },
    });
    return product ? withImageUrl(product) : null;
  }

  async create(dto: CreateProductDto) {
    const providedSku = dto.sku?.trim();

    if (providedSku) {
      const existing = await this.prisma.product.findUnique({ where: { sku: providedSku } });
      if (existing) throw new ConflictException('SKU already exists');
    }

    const sku = providedSku || await this.generateCategorySKU(dto.categoryId);

    const { quantity, minStock, sku: _ignoredSku, ...rest } = dto;
    const productData = { ...rest, sku };

    const product = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: productData as any, include: PRODUCT_INCLUDE });

      // IMEI-tracked products get their stock from registered IMEI devices
      // (1 IMEI = 1 unit), so they always start at 0 and ignore any manual
      // "quantity" provided at creation time.
      if (productData.trackImei) {
        await tx.inventory.create({
          data: { productId: product.id, quantity: 0, minStock: minStock ?? 5 },
        });
        return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: PRODUCT_INCLUDE });
      }

      if (quantity !== undefined) {
        // Single shop - create one inventory entry
        await tx.inventory.create({
          data: { productId: product.id, quantity, minStock: minStock ?? 5 },
        });
        return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: PRODUCT_INCLUDE });
      }

      return product;
    });

    return withImageUrl(product);
  }

  // Generates a stable, unique SKU from the category name, e.g. "Electronics" -> ELE-0001.
  // Sequence is per-category (counts existing products in that category), so each
  // category has its own independent counter starting at 0001.
  private async generateCategorySKU(categoryId: string): Promise<string> {
    const category = await this.prisma.category.findUniqueOrThrow({ where: { id: categoryId } });

    const letters = category.name.toUpperCase().replace(/[^A-Z]/g, '');
    const prefix = letters.length > 0 ? letters.padEnd(3, 'X').slice(0, 3) : 'GEN';

    for (let attempt = 0; attempt < 5; attempt++) {
      const countInCategory = await this.prisma.product.count({ where: { categoryId } });
      const sequence = String(countInCategory + 1 + attempt).padStart(4, '0');
      const candidate = `${prefix}-${sequence}`;

      const exists = await this.prisma.product.findUnique({ where: { sku: candidate } });
      if (!exists) return candidate;
    }

    // Fallback if collisions persist (e.g. concurrent creations racing on the same count)
    return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    await this.prisma.product.findUniqueOrThrow({ where: { id } });
    const product = await this.prisma.product.update({ where: { id }, data: dto as any, include: PRODUCT_INCLUDE });
    return withImageUrl(product);
  }

  async remove(id: string) {
    await this.prisma.product.findUniqueOrThrow({ where: { id } });
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  // ─── Product image (stored as binary data in MySQL, never returned inline) ────

  async setImage(productId: string, data: Buffer, mimeType: string, filename: string, size: number) {
    await this.prisma.product.findUniqueOrThrow({ where: { id: productId } });
    // upsert: replaces the existing image (old binary data is overwritten, not left orphaned)
    return this.prisma.productImage.upsert({
      where: { productId },
      create: { productId, data, mimeType, filename, size },
      update: { data, mimeType, filename, size },
    });
  }

  async getImage(productId: string) {
    return this.prisma.productImage.findUnique({ where: { productId } });
  }

  async removeImage(productId: string) {
    const existing = await this.prisma.productImage.findUnique({ where: { productId } });
    if (!existing) throw new NotFoundException('No image for this product');
    await this.prisma.productImage.delete({ where: { productId } });
    return { success: true };
  }

  // Categories
  findAllCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Category already exists');
    return this.prisma.category.create({ data: dto });
  }

  deleteCategory(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  // Brands
  findAllBrands() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  async createBrand(dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Brand already exists');
    return this.prisma.brand.create({ data: dto });
  }

  deleteBrand(id: string) {
    return this.prisma.brand.delete({ where: { id } });
  }

  async bulkPurchaseProducts(dto: BulkProductPurchaseDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const createdProducts: Array<any> = [];

      // Create products
      for (const item of dto.products) {
        // Check if SKU already exists
        const existing = await tx.product.findUnique({ where: { sku: item.sku } });
        if (existing) {
          throw new ConflictException(`SKU ${item.sku} already exists`);
        }

        const product = await tx.product.create({
          data: {
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            categoryId: item.categoryId,
            brandId: item.brandId,
            supplierId: dto.supplierId,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            description: item.description,
            isActive: false,
          },
        });

        createdProducts.push({ ...product, quantity: item.quantity });
      }

      // Calculate totals
      const subtotal = dto.products.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
      const tax = dto.tax ?? 0;
      const total = subtotal + tax;
      const amountPaid = dto.amountPaid ?? 0;
      const amountDue = total - amountPaid;

      let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
      if (amountPaid >= total) {
        paymentStatus = 'PAID';
      } else if (amountPaid > 0) {
        paymentStatus = 'PARTIALLY_PAID';
      } else {
        paymentStatus = 'UNPAID';
      }

      // Create purchase order
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: dto.supplierId,
          subtotal,
          tax,
          total,
          amountPaid,
          amountDue,
          paymentStatus: paymentStatus as any,
          notes: dto.notes,
          items: {
            create: createdProducts.map(p => ({
              productId: p.id,
              quantity: p.quantity,
              costPrice: p.costPrice,
            })),
          },
        },
        include: {
          supplier: true,
          items: { include: { product: true } },
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
            notes: 'Initial payment on product purchase',
          },
        });
      }

      return {
        purchaseOrder,
        products: createdProducts,
      };
    });
  }
}
