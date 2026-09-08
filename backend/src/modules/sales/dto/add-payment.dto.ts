import { IsString, IsNumber, IsEnum, Min } from 'class-validator';

export class AddPaymentDto {
  @IsString()
  saleId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['CASH', 'CARD', 'BANK_TRANSFER', 'QR'])
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'QR';
}
