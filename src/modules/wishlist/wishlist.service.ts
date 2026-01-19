import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: number) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                fullName: true,
                // Don't expose contact details in wishlist
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          deliveryFee: item.product.deliveryFee,
          images: item.product.images,
          condition: item.product.condition,
          conditionRating: item.product.conditionRating,
          locationState: item.product.locationState,
          type: item.product.type,
          quantity: item.product.quantity,
          outOfStock: item.product.outOfStock,
          active: item.product.active,
          seller: item.product.seller,
        },
        createdAt: item.createdAt,
      })),
      itemCount: items.length,
    };
  }

  async addToWishlist(userId: number, productId: number) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user is trying to add their own product
    if (product.sellerId === userId) {
      throw new BadRequestException('You cannot add your own product to wishlist');
    }

    // Check if already in wishlist
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      return { success: true, message: 'Item already in wishlist', item: existing };
    }

    const item = await this.prisma.wishlistItem.create({
      data: { userId, productId },
      include: { product: true },
    });

    return { success: true, message: 'Item added to wishlist', item };
  }

  async removeFromWishlist(userId: number, productId: number) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!item) {
      throw new NotFoundException('Item not in wishlist');
    }

    await this.prisma.wishlistItem.delete({
      where: { id: item.id },
    });

    return { success: true, message: 'Item removed from wishlist' };
  }

  async toggleWishlist(userId: number, productId: number) {
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.wishlistItem.delete({ where: { id: existing.id } });
      return { success: true, isWishlisted: false, message: 'Item removed from wishlist' };
    }

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId === userId) {
      throw new BadRequestException('You cannot add your own product to wishlist');
    }

    await this.prisma.wishlistItem.create({
      data: { userId, productId },
    });

    return { success: true, isWishlisted: true, message: 'Item added to wishlist' };
  }

  async isInWishlist(userId: number, productId: number) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    return { isWishlisted: !!item };
  }

  async getWishlistCount(userId: number) {
    const count = await this.prisma.wishlistItem.count({
      where: { userId },
    });
    return { count };
  }

  async clearWishlist(userId: number) {
    await this.prisma.wishlistItem.deleteMany({
      where: { userId },
    });

    return { success: true, message: 'Wishlist cleared' };
  }
}
