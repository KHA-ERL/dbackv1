import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from '../modules/websocket/websocket.gateway';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, EscrowStatus } from '@prisma/client';

@Injectable()
export class EscrowAutoConfirmTask {
  private readonly logger = new Logger(EscrowAutoConfirmTask.name);
  private readonly autoReleaseMinutes: number;

  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
    private configService: ConfigService,
  ) {
    // Default to 72 hours (4320 minutes) if not configured
    this.autoReleaseMinutes =
      parseInt(
        this.configService.get<string>('AUTO_RELEASE_AFTER_MINUTES'),
      ) || 4320;
  }

  // Run every 10 minutes
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleAutoConfirm() {
    this.logger.log('Running escrow auto-confirm task...');

    try {
      // Calculate cutoff time
      const cutoffTime = new Date(
        Date.now() - this.autoReleaseMinutes * 60 * 1000,
      );

      // Find orders that should be auto-confirmed
      const ordersToConfirm = await this.prisma.order.findMany({
        where: {
          receivedAt: {
            lte: cutoffTime,
          },
          satisfied: false,
        },
        include: {
          escrow: true,
        },
      });

      this.logger.log(`Found ${ordersToConfirm.length} orders to auto-confirm`);

      for (const order of ordersToConfirm) {
        // Mark order as satisfied
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            satisfied: true,
            status: OrderStatus.COMPLETED,
          },
        });

        // Release escrow if exists
        if (order.escrow && order.escrow.status === EscrowStatus.HELD) {
          await this.prisma.escrow.update({
            where: { id: order.escrow.id },
            data: {
              status: EscrowStatus.RELEASED,
              releasedAt: new Date(),
            },
          });

          this.logger.log(`Released escrow for order ${order.id}`);
          // TODO: Transfer funds to seller via Paystack
        }

        // Send WebSocket notification
        this.notificationGateway.notifyOrderUpdate(order.id, {
          type: 'AUTO_SATISFIED',
          order_id: order.id,
          message: 'Order automatically confirmed after timeout',
        });
      }

      this.logger.log('Escrow auto-confirm task completed');
    } catch (error) {
      this.logger.error('Error in escrow auto-confirm task:', error);
    }
  }
}
