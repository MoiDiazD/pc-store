import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import type { FastifyRequest } from 'fastify';

import { Roles } from '../auth/roles.decorator';

import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
  ) {}

  @Get()
  getCart(@Req() request: FastifyRequest) {
    return this.cartService.getCart(
      request.user!.id,
    );
  }

  @Post('items')
  addItem(
    @Req() request: FastifyRequest,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(
      request.user!.id,
      dto,
    );
  }

  @Patch('items/:productId')
  updateItem(
    @Req() request: FastifyRequest,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(
      request.user!.id,
      Number(productId),
      dto,
    );
  }

  @Delete('items/:productId')
  removeItem(
    @Req() request: FastifyRequest,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(
      request.user!.id,
      Number(productId),
    );
  }
}