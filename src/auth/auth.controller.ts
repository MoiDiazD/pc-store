import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
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
  @Post('logout')
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true })
    response: FastifyReply,
  ) {
    const sessionToken =
      request.cookies[SESSION_COOKIE_NAME];

    if (sessionToken) {
      await this.authService.logout(sessionToken);
    }

    response.clearCookie(
      SESSION_COOKIE_NAME,
      {
        path: '/',
      },
    );
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() request: FastifyRequest) {
    return request.user;
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Req() request: FastifyRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      request.user!.id,
      dto,
    );
  }
}