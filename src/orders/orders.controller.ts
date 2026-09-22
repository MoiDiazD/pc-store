import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
} from '@nestjs/common';

import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @Post('checkout')
  async checkout(@Request() request: { user: { id: number } }) {
    return this.ordersService.checkout(request.user.id);
  }

  @Get()
  async findMyOrders(
    @Request() request: { user: { id: number } },
  ) {
    return this.ordersService.findMyOrders(
      request.user.id,
    );
  }

  @Get(':id')
  async findMyOrder(
    @Request() request: { user: { id: number } },
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.findMyOrder(
      request.user.id,
      orderId,
    );
  }
}