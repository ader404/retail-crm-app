import { IsString, IsOptional, IsNumber, IsBoolean, IsDecimal, Min, IsNotEmpty } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateProductDto {
  @IsString() @IsNotEmpty()
  name: string

  @IsString() @IsOptional()
  sku?: string

  @IsString() @IsOptional()
  barcode?: string

  @IsString() @IsOptional()
  description?: string

  @IsString() @IsNotEmpty()
  categoryId: string

  @IsString() @IsOptional()
  brandId?: string

  @IsString() @IsNotEmpty()
  supplierId: string

  @Type(() => Number) @IsNumber() @Min(0)
  costPrice: number

  @Type(() => Number) @IsNumber() @Min(0)
  sellingPrice: number

  @IsBoolean() @IsOptional()
  trackImei?: boolean

  @IsBoolean() @IsOptional()
  isActive?: boolean

  @Type(() => Number) @IsNumber() @Min(0) @IsOptional()
  quantity?: number

  @Type(() => Number) @IsNumber() @Min(0) @IsOptional()
  minStock?: number
}
