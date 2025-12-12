import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaystackService } from '../../services/paystack.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
  ) {}

  async initializePayment(
    userId: number,
    productId: number,
    callbackUrl?: string,
  ) {
    // Fetch product
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Create order (status PENDING)
    const reference = `${Date.now()}-${product.id}`;
    const order = await this.prisma.order.create({
      data: {
        reference,
        productId: product.id,
        buyerId: userId,
        sellerId: product.sellerId,
        price: product.price,
        deliveryFee: product.deliveryFee || 0,
        status: OrderStatus.PENDING,
      },
    });

    // Calculate amount in kobo (NGN smallest unit = kobo = 1/100 naira)
    const totalAmount = (order.price || 0) + (order.deliveryFee || 0);
    const amountInKobo = totalAmount * 100;

    // Initialize Paystack transaction
    const paystackResponse = await this.paystackService.initializeTransaction(
      user.email,
      amountInKobo,
      order.reference,
      { order_id: order.id },
      callbackUrl,
    );

    return {
      authorization_url: paystackResponse.authorization_url,
      access_code: paystackResponse.access_code,
      reference: paystackResponse.reference,
      order_id: order.id,
    };
  }

  async verifyPayment(reference: string) {
    // Verify with Paystack
    const verification = await this.paystackService.verifyTransaction(
      reference,
    );

    if (verification.status !== 'success') {
      return { success: false, message: 'Payment not successful' };
    }

    // Find order
    const order = await this.prisma.order.findUnique({
      where: { reference },
      include: { product: true, buyer: true, seller: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update order to PAID
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAID },
    });

    // Create escrow record
    const totalAmount = order.price + order.deliveryFee;
    await this.prisma.escrow.create({
      data: {
        orderId: order.id,
        amount: totalAmount,
        currency: 'NGN',
        status: 'HELD',
        gatewayTransactionId: reference,
      },
    });

    return {
      success: true,
      order,
      message: 'Payment verified and funds held in escrow',
    };
  }

  async handleWebhook(payload: any, signature: string) {
    // Verify webhook signature
    const isValid = this.paystackService.verifyWebhookSignature(
      JSON.stringify(payload),
      signature,
    );

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Handle different event types
    if (payload.event === 'charge.success') {
      const reference = payload.data.reference;
      await this.verifyPayment(reference);
    }

    return { status: 'received' };
  }
}
