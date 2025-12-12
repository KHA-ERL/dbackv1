import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  locationState?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFee?: number;

  @IsString()
  @IsIn(['Declutter', 'Online Store'])
  type: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50000000)
  quantity?: number;
}
