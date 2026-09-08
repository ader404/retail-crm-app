import { IsEnum, IsString, IsNumber, IsOptional, IsDateString, Min, MaxLength } from 'class-validator';

export class CreateChequeDto {
  @IsString()
  @MaxLength(100)
  chequeNumber: string;

  @IsEnum(['INCOMING', 'OUTGOING'])
  type: 'INCOMING' | 'OUTGOING';

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  partyName?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  saleId?: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsString()
  userId: string;
}
