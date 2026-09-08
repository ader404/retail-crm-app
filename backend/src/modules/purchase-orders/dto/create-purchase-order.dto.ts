import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseOrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  costPrice: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  supplierId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsOptional()
  @IsNumber()
  tax?: number;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsDateString()
  expectedDelivery?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
