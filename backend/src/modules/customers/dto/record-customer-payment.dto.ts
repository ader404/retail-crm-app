import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export class RecordCustomerPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['CASH', 'CARD', 'BANK_TRANSFER', 'QR'])
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'QR';

  @IsString()
  @IsOptional()
  notes?: string;
}
