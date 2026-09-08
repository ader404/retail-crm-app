import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ChequesQueryDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: Date;

  @IsOptional()
  @IsDateString()
  dateTo?: Date;

  @IsOptional()
  @IsEnum(['INCOMING', 'OUTGOING'])
  type?: 'INCOMING' | 'OUTGOING';

  @IsOptional()
  @IsEnum(['PENDING', 'DEPOSITED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'RETURNED', 'CANCELLED'])
  status?: 'PENDING' | 'DEPOSITED' | 'PRESENTED' | 'CLEARED' | 'BOUNCED' | 'RETURNED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsDateString()
  dueDateFrom?: Date;

  @IsOptional()
  @IsDateString()
  dueDateTo?: Date;
}
