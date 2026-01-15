import { IsInt, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class InitializePaymentDto {
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  })
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsInt({ message: 'Product ID must be a valid integer' })
  productId: number;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
