import { IsString, IsNumber, IsOptional, IsDateString, Min, MaxLength } from 'class-validator';

export class UpdateChequeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  chequeNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

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
}
