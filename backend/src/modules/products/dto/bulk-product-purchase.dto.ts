import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BulkProductItemDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsNumber()
  costPrice: number;

  @IsNumber()
  sellingPrice: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class BulkProductPurchaseDto {
  @IsString()
  supplierId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkProductItemDto)
  products: BulkProductItemDto[];

  @IsOptional()
  @IsNumber()
  tax?: number;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
