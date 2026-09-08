import { IsEnum, IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateLoanDto {
  @IsEnum(['CUSTOMER_LOAN', 'SUPPLIER_LOAN'])
  type: 'CUSTOMER_LOAN' | 'SUPPLIER_LOAN';

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

  @IsNumber()
  @Min(0.01)
  principalAmount: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
