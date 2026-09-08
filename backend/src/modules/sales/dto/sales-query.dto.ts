import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SalesQueryDto extends PaginationDto {
  @IsOptional()
  @Type(() => Date)
  dateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  dateTo?: Date;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(['PAID', 'PARTIALLY_PAID', 'UNPAID', 'OVERDUE'])
  paymentStatus?: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'OVERDUE';

  @IsOptional()
  @IsEnum(['COMPLETED', 'PENDING', 'CANCELLED', 'REFUNDED'])
  status?: 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'REFUNDED';

  @IsOptional()
  @IsEnum(['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHECK', 'OTHER'])
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
