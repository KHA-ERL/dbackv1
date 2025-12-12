import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, EscrowStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: number, productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const reference = uuidv4();

    return this.prisma.order.create({
      data: {
        reference,
        productId: product.id,
        buyerId: userId,
        sellerId: product.sellerId,
        price: product.price,
        deliveryFee: product.deliveryFee,
        status: OrderStatus.PENDING,
      },
      include: {
        product: true,
        buyer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async getMyOrders(userId: number) {
    return this.prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        product: true,
        buyer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAllOrders(skip: number = 0, limit: number = 100) {
    return this.prisma.order.findMany({
      skip,
      take: limit,
      include: {
        product: true,
        buyer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateOrderStatus(
    orderId: number,
    userId: number,
    newStatus: OrderStatus,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true, buyer: true, seller: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.sellerId !== userId) {
      throw new ForbiddenException('Only seller can update order status');
    }

    if (
      newStatus !== OrderStatus.PROCESSING &&
      newStatus !== OrderStatus.SHIPPED
    ) {
      throw new BadRequestException(
        'Seller may only set status to PROCESSING or SHIPPED',
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    // TODO: Send WebSocket notification
    return { ok: true, status: updatedOrder.status };
  }

  async confirmReceived(orderId: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('Not buyer');
    }

    if (order.status !== OrderStatus.SHIPPED) {
      throw new BadRequestException(
        'Order must be in SHIPPED status before confirming receipt',
      );
    }

    // Update order to delivered
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        receivedAt: new Date(),
        status: OrderStatus.DELIVERED,
      },
    });

    // Update product availability
    const product = order.product;
    if (product.type === 'Declutter') {
      await this.prisma.product.update({
        where: { id: product.id },
        data: {
          isDisabled: true,
          active: false,
        },
      });
    } else if (product.type === 'Online Store') {
      const newQuantity = product.quantity - 1;
      await this.prisma.product.update({
        where: { id: product.id },
        data: {
          quantity: newQuantity,
          isDisabled: newQuantity <= 0,
          active: newQuantity > 0,
        },
      });
    }

    // TODO: Send WebSocket notification
    return { ok: true };
  }

  async confirmSatisfied(orderId: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { escrow: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('Not buyer');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Order must be DELIVERED before you can confirm satisfaction',
      );
    }

    // Update order
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        satisfied: true,
        status: OrderStatus.COMPLETED,
      },
    });

    // Release escrow
    if (order.escrow && order.escrow.status === EscrowStatus.HELD) {
      await this.prisma.escrow.update({
        where: { id: order.escrow.id },
        data: {
          status: EscrowStatus.RELEASED,
          releasedAt: new Date(),
        },
      });
      // TODO: Transfer funds to seller via Paystack
    }

    // TODO: Send WebSocket notification
    return { ok: true };
  }
}
