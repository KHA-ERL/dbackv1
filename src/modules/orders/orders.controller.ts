import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleEnum } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @CurrentUser('id') userId: number,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, createOrderDto.productId);
  }

  @Get('my')
  async getMyOrders(@CurrentUser('id') userId: number) {
    return this.ordersService.getMyOrders(userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin)
  async getAllOrders(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '100',
  ) {
    return this.ordersService.getAllOrders(parseInt(skip), parseInt(limit));
  }

  @Put(':id/status')
  async updateOrderStatus(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: number,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(
      parseInt(orderId),
      userId,
      updateStatusDto.status,
    );
  }

  @Post(':id/confirm_received')
  async confirmReceived(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.ordersService.confirmReceived(parseInt(orderId), userId);
  }

  @Post(':id/confirm_satisfied')
  async confirmSatisfied(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.ordersService.confirmSatisfied(parseInt(orderId), userId);
  }
}
