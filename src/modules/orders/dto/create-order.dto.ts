import { IsInt } from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  productId: number;
}
