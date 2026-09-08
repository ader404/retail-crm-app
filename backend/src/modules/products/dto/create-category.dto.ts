import { IsString, IsNotEmpty } from 'class-validator'

export class CreateCategoryDto {
  @IsString() @IsNotEmpty()
  name: string
}

export class CreateBrandDto {
  @IsString() @IsNotEmpty()
  name: string
}
