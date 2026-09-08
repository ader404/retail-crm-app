import { IsString, IsOptional, IsEmail } from 'class-validator'

export class CreateSupplierDto {
  @IsString()
  companyName: string

  @IsString() @IsOptional()
  contactPerson?: string

  @IsString() @IsOptional()
  phone?: string

  @IsEmail() @IsOptional()
  email?: string

  @IsString() @IsOptional()
  address?: string
}
