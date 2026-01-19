import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: number) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                fullName: true,
                // Don't expose contact details in cart
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const deliveryTotal = items.reduce((sum, item) => sum + (item.product.deliveryFee || 0), 0);
    const total = subtotal + deliveryTotal;

    return {
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          deliveryFee: item.product.deliveryFee,
          images: item.product.images,
          condition: item.product.condition,
          locationState: item.product.locationState,
          type: item.product.type,
          availableQuantity: item.product.quantity,
          outOfStock: item.product.outOfStock,
          seller: item.product.seller,
        },
        createdAt: item.createdAt,
      })),
      subtotal,
      deliveryTotal,
      total,
      itemCount: items.length,
    };
  }

  async addToCart(userId: number, productId: number, quantity: number = 1) {
    // Check if product exists and is active
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.active || product.isDisabled) {
      throw new BadRequestException('This product is not available');
    }

    if (product.outOfStock) {
      throw new BadRequestException('This product is out of stock');
    }

    // Check if user is trying to add their own product
    if (product.sellerId === userId) {
      throw new BadRequestException('You cannot add your own product to cart');
    }

    // For Declutter items, check if already sold
    if (product.type === 'Declutter') {
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          productId,
          status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
        },
      });
      if (existingOrder) {
        throw new BadRequestException('This item has already been sold');
      }
    }

    // Check if item is already in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existingItem) {
      // For Declutter, quantity is always 1
      if (product.type === 'Declutter') {
        return existingItem;
      }

      // For Online Store, update quantity
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.quantity) {
        throw new BadRequestException(`Only ${product.quantity} items available`);
      }

      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { product: true },
      });
    }

    // Validate quantity for Online Store
    if (product.type === 'Online Store' && quantity > product.quantity) {
      throw new BadRequestException(`Only ${product.quantity} items available`);
    }

    // Add new item to cart
    return this.prisma.cartItem.create({
      data: {
        userId,
        productId,
        quantity: product.type === 'Declutter' ? 1 : quantity,
      },
      include: { product: true },
    });
  }

  async updateCartItem(userId: number, productId: number, quantity: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
      include: { product: true },
    });

    if (!item) {
      throw new NotFoundException('Item not in cart');
    }

    if (quantity <= 0) {
      return this.removeFromCart(userId, productId);
    }

    // For Declutter, quantity is always 1
    if (item.product.type === 'Declutter') {
      return item;
    }

    // Check available quantity
    if (quantity > item.product.quantity) {
      throw new BadRequestException(`Only ${item.product.quantity} items available`);
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
      include: { product: true },
    });
  }

  async removeFromCart(userId: number, productId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!item) {
      throw new NotFoundException('Item not in cart');
    }

    await this.prisma.cartItem.delete({
      where: { id: item.id },
    });

    return { success: true, message: 'Item removed from cart' };
  }

  async clearCart(userId: number) {
    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    return { success: true, message: 'Cart cleared' };
  }

  async getCartCount(userId: number) {
    const count = await this.prisma.cartItem.count({
      where: { userId },
    });
    return { count };
  }
}
