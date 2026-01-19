import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(0)
  @Max(10)
  conditionRating?: number;

  @IsOptional()
  @IsString()
  locationState?: string;

  // Accept snake_case from frontend
  @IsOptional()
  @IsString()
  location_state?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 0))
  @IsInt()
  @Min(0)
  deliveryFee?: number;

  // Accept snake_case from frontend
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 0))
  @IsInt()
  @Min(0)
  delivery_fee?: number;

  @IsString()
  @IsIn(['Declutter', 'Online Store'])
  type: string;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  @IsInt()
  @Min(1)
  @Max(50000000)
  quantity?: number;
}
