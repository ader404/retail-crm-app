import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class LoansQueryDto extends PaginationDto {
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
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'COMPLETED', 'OVERDUE', 'CANCELLED'])
  status?: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

  @IsOptional()
  @IsEnum(['CUSTOMER', 'SUPPLIER'])
  type?: 'CUSTOMER' | 'SUPPLIER';

  @IsOptional()
  @Type(() => Number)
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;
}
