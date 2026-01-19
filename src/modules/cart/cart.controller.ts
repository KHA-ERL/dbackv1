import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser('id') userId: number) {
    return this.cartService.getCart(userId);
  }

  @Get('count')
  async getCartCount(@CurrentUser('id') userId: number) {
    return this.cartService.getCartCount(userId);
  }

  @Post('add')
  async addToCart(
    @CurrentUser('id') userId: number,
    @Body() body: { productId: number; quantity?: number },
  ) {
    return this.cartService.addToCart(userId, body.productId, body.quantity || 1);
  }

  @Put(':productId')
  async updateCartItem(
    @CurrentUser('id') userId: number,
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateCartItem(userId, parseInt(productId), body.quantity);
  }

  @Delete(':productId')
  async removeFromCart(
    @CurrentUser('id') userId: number,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeFromCart(userId, parseInt(productId));
  }

  @Delete()
  async clearCart(@CurrentUser('id') userId: number) {
    return this.cartService.clearCart(userId);
  }
}
