import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Get()
  async getWishlist(@CurrentUser('id') userId: number) {
    return this.wishlistService.getWishlist(userId);
  }

  @Get('count')
  async getWishlistCount(@CurrentUser('id') userId: number) {
    return this.wishlistService.getWishlistCount(userId);
  }

  @Get('check/:productId')
  async isInWishlist(
    @CurrentUser('id') userId: number,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.isInWishlist(userId, parseInt(productId));
  }

  @Post('add/:productId')
  async addToWishlist(
    @CurrentUser('id') userId: number,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.addToWishlist(userId, parseInt(productId));
  }

  @Post('toggle/:productId')
  async toggleWishlist(
    @CurrentUser('id') userId: number,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.toggleWishlist(userId, parseInt(productId));
  }

  @Delete(':productId')
  async removeFromWishlist(
    @CurrentUser('id') userId: number,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeFromWishlist(userId, parseInt(productId));
  }

  @Delete()
  async clearWishlist(@CurrentUser('id') userId: number) {
    return this.wishlistService.clearWishlist(userId);
  }
}
