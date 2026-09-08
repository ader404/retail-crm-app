import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class TestConnectionDto {
  @IsString() @IsNotEmpty()
  host: string

  @Type(() => Number) @IsInt() @Min(1) @Max(65535)
  port: number

  @IsString() @IsNotEmpty()
  database: string

  @IsString() @IsNotEmpty()
  user: string

  @IsString() @IsOptional()
  password?: string
}
