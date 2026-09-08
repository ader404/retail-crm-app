import { IsString, IsOptional, IsBoolean } from 'class-validator'

export class UpdateSettingsDto {
  @IsString() @IsOptional()
  companyName?: string

  @IsString() @IsOptional()
  logoUrl?: string

  @IsString() @IsOptional()
  address?: string

  @IsString() @IsOptional()
  phone?: string

  @IsString() @IsOptional()
  email?: string

  @IsString() @IsOptional()
  taxId?: string

  @IsString() @IsOptional()
  currency?: string

  @IsString() @IsOptional()
  receiptFooter?: string

  @IsBoolean() @IsOptional()
  showLogoOnReceipt?: boolean

  @IsString() @IsOptional()
  receiptLocale?: string

  @IsBoolean() @IsOptional()
  showPhoneOnReceipt?: boolean

  @IsBoolean() @IsOptional()
  showEmailOnReceipt?: boolean

  @IsBoolean() @IsOptional()
  showAddressOnReceipt?: boolean

  @IsBoolean() @IsOptional()
  showTaxIdOnReceipt?: boolean
}
