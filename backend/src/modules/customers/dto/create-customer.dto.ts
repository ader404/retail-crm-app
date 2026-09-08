import { IsString, IsOptional, IsEmail } from 'class-validator'

export class CreateCustomerDto {
  @IsString()
  name: string

  @IsString() @IsOptional()
  phone?: string

  @IsEmail() @IsOptional()
  email?: string

  @IsString() @IsOptional()
  address?: string

  @IsString() @IsOptional()
  notes?: string
}
