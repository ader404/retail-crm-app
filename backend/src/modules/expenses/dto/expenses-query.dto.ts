import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ExpensesQueryDto extends PaginationDto {
  @IsOptional()
  @Type(() => Date)
  dateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  dateTo?: Date;

  @IsOptional()
  @IsEnum(['RENT', 'UTILITIES', 'SALARIES', 'SUPPLIES', 'MAINTENANCE', 'MARKETING', 'TRANSPORTATION', 'OTHER'])
  category?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;
}
