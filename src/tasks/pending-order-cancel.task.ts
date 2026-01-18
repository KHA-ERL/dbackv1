import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from '../modules/websocket/websocket.gateway';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PendingOrderCancelTask {
  private readonly logger = new Logger(PendingOrderCancelTask.name);
  // Cancel orders pending for more than 12 hours (720 minutes)
  private readonly cancelAfterMinutes = 720;

  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
  ) {}

  // Run every 30 minutes
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handlePendingOrderCancel() {
    this.logger.log('Running pending order cancellation task...');

    try {
      // Calculate cutoff time (12 hours ago)
      const cutoffTime = new Date(
        Date.now() - this.cancelAfterMinutes * 60 * 1000,
      );

      // Find orders that are PENDING and older than 12 hours
      const ordersToCancel = await this.prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING,
          createdAt: {
            lte: cutoffTime,
          },
        },
        include: {
          product: true,
          buyer: true,
          seller: true,
        },
      });

      this.logger.log(`Found ${ordersToCancel.length} pending orders to cancel`);

      for (const order of ordersToCancel) {
        // Update order status to CANCELLED
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
          },
        });

        this.logger.log(`Cancelled pending order ${order.id} (reference: ${order.reference})`);

        // Send WebSocket notification to buyer
        this.notificationGateway.notifyOrderUpdate(order.id, {
          type: 'ORDER_CANCELLED',
          order_id: order.id,
          message: 'Order cancelled due to payment timeout (12 hours)',
        });
      }

      this.logger.log('Pending order cancellation task completed');
    } catch (error) {
      this.logger.error('Error in pending order cancellation task:', error);
    }
  }
}
