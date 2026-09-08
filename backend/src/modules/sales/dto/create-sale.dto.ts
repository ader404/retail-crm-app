import { IsString, IsOptional, IsNumber, IsArray, IsEnum, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class SaleItemDto {
  @IsString()
  productId: string

  @Type(() => Number) @IsNumber() @Min(1)
  quantity: number

  @Type(() => Number) @IsNumber() @Min(0)
  costPrice: number

  @Type(() => Number) @IsNumber() @Min(0)
  sellingPrice: number

  @Type(() => Number) @IsNumber() @Min(0) @IsOptional()
  discount?: number

  @IsArray() @IsOptional()
  imeiDeviceIds?: string[]
}

export class CreateSaleDto {
  @IsString() @IsOptional()
  customerId?: string

  @IsString()
  userId: string

  @IsEnum(['CASH', 'CARD', 'BANK_TRANSFER', 'QR'])
  paymentMethod: string

  @Type(() => Number) @IsNumber() @Min(0) @IsOptional()
  discount?: number

  @IsEnum(['PERCENTAGE', 'FIXED_AMOUNT']) @IsOptional()
  discountType?: string

  @Type(() => Number) @IsNumber() @Min(0) @IsOptional()
  tax?: number

  @Type(() => Number) @IsNumber() @Min(0) @IsOptional()
  amountPaid?: number

  @IsString() @IsOptional()
  notes?: string

  @IsArray() @ValidateNested({ each: true }) @Type(() => SaleItemDto)
  items: SaleItemDto[]
}
