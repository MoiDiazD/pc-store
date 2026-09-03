import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from './auth.constants';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true })
    response: FastifyReply,
  ) {
    const { sessionToken, user } =
      await this.authService.login(dto);

    response.setCookie(
      SESSION_COOKIE_NAME,
      sessionToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_DURATION_MS / 1000,
      },
    );

    return user;
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() request: FastifyRequest) {
    return request.user;
  }
}