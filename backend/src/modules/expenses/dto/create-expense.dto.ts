import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { ExpenseCategory } from '@prisma/client'

export class CreateExpenseDto {
  @IsString() @IsNotEmpty() userId: string
  @IsEnum(ExpenseCategory) category: ExpenseCategory
  @IsNumber() @Min(0) amount: number
  @IsString() @IsOptional() description?: string
  @IsString() @IsOptional() date?: string
}
