import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Res, UploadedFile, UseInterceptors, BadRequestException, NotFoundException, UseGuards } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { extname } from 'path'
import type { Response } from 'express'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ProductsService } from './products.service'
import { CreateProductDto } from './dto/create-product.dto'
import { CreateCategoryDto, CreateBrandDto } from './dto/create-category.dto'
import { BulkProductPurchaseDto } from './dto/bulk-product-purchase.dto'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

const IMAGE_MIME_REGEX = /^image\/(jpeg|jpg|png|gif|webp)$/
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
const MAGIC_NUMBERS: Record<string, number[]> = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  gif: [0x47, 0x49, 0x46],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF
}

// Images are stored as binary data in MySQL (ProductImage.data), not on disk —
// memoryStorage keeps the upload in a Buffer so it can be written straight to the DB.
const imageUpload = {
  storage: memoryStorage(),
  fileFilter: (_req: any, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    if (!IMAGE_MIME_REGEX.test(file.mimetype)) {
      return cb(new BadRequestException('Only image files (JPEG, PNG, GIF, WEBP) allowed'), false)
    }
    const ext = extname(file.originalname).toLowerCase()
    if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
      return cb(new BadRequestException('Invalid file extension'), false)
    }
    cb(null, true)
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 1,
  },
}

function assertValidImageBuffer(buffer: Buffer) {
  const isValid = Object.values(MAGIC_NUMBERS).some((signature) =>
    signature.every((byte, i) => buffer[i] === byte),
  )
  if (!isValid) throw new BadRequestException('Invalid image file format')
}

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.productsService.findAll(paginationDto);
  }

  @Get('categories') findAllCategories() { return this.productsService.findAllCategories() }
  @Get('brands') findAllBrands() { return this.productsService.findAllBrands() }
  @Get('barcode/:barcode') findByBarcode(@Param('barcode') barcode: string) { return this.productsService.findByBarcode(barcode) }
  @Get(':id') findOne(@Param('id') id: string) { return this.productsService.findOne(id) }

  @Post()
  create(@Body() dto: CreateProductDto) { return this.productsService.create(dto) }

  @Post('bulk-purchase')
  bulkPurchaseProducts(@Body() dto: BulkProductPurchaseDto) {
    return this.productsService.bulkPurchaseProducts(dto);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', imageUpload))
  async uploadProductImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    assertValidImageBuffer(file.buffer);
    await this.productsService.setImage(id, file.buffer, file.mimetype, file.originalname, file.size);
    return { imageUrl: `/products/${id}/image` };
  }

  @Get(':id/image')
  async getProductImage(@Param('id') id: string, @Res() res: Response) {
    const image = await this.productsService.getImage(id);
    if (!image) throw new NotFoundException('No image for this product');
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Content-Length', String(image.size));
    res.send(image.data);
  }

  @Delete(':id/image')
  removeProductImage(@Param('id') id: string) {
    return this.productsService.removeImage(id);
  }

  @Post('categories') createCategory(@Body() dto: CreateCategoryDto) { return this.productsService.createCategory(dto) }
  @Post('brands') createBrand(@Body() dto: CreateBrandDto) { return this.productsService.createBrand(dto) }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) { return this.productsService.update(id, dto) }

  @Delete('categories/:id') deleteCategory(@Param('id') id: string) { return this.productsService.deleteCategory(id) }
  @Delete('brands/:id') deleteBrand(@Param('id') id: string) { return this.productsService.deleteBrand(id) }
  @Delete(':id') remove(@Param('id') id: string) { return this.productsService.remove(id) }
}
