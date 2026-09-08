import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export class CreateSupplierPaymentDto {
  @IsString()
  supplierId: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['CASH', 'CARD', 'BANK_TRANSFER', 'QR'])
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'QR';

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
