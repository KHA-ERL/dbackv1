import { IsInt, IsOptional, IsString } from 'class-validator';

export class InitializePaymentDto {
  @IsInt()
  productId: number;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
