import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationGateway');
  private connectedClients = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join_order_room')
  handleJoinOrderRoom(client: Socket, orderId: number) {
    const room = `order:${orderId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    return { event: 'joined', room };
  }

  @SubscribeMessage('join_admin_room')
  handleJoinAdminRoom(client: Socket) {
    const room = 'admin:orders';
    client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    return { event: 'joined', room };
  }

  // Emit order status updates to specific order room
  notifyOrderUpdate(orderId: number, data: any) {
    const room = `order:${orderId}`;
    this.server.to(room).emit('order_update', data);
    this.logger.log(`Notified ${room} with data:`, data);
  }

  // Emit to admin room
  notifyAdminOrders(data: any) {
    this.server.to('admin:orders').emit('admin_order_update', data);
    this.logger.log('Notified admin room with data:', data);
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`Broadcast ${event}:`, data);
  }
}
