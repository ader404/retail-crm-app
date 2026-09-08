import { IsString, IsOptional, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class AdjustStockDto {
  @IsString()
  productId: string

  @Type(() => Number) @IsNumber() @Min(0)
  quantity: number

  @Type(() => Number) @IsNumber() @Min(0) @IsOptional()
  minStock?: number

  @Type(() => Number) @IsNumber() @Min(0) @IsOptional()
  costPrice?: number
}
