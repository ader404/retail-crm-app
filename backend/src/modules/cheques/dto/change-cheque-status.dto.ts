import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChangeChequeStatusDto {
  @IsEnum(['PENDING', 'DEPOSITED', 'PRESENTED', 'CLEARED', 'BOUNCED', 'RETURNED', 'CANCELLED'])
  status: 'PENDING' | 'DEPOSITED' | 'PRESENTED' | 'CLEARED' | 'BOUNCED' | 'RETURNED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
