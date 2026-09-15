import {
  Controller,
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
}