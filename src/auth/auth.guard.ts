import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

import { UsersRepository } from '../users/users.repository';
import { SESSION_COOKIE_NAME } from './auth.constants';
import { SessionsRepository } from './sessions.repository';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (isPublic) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<FastifyRequest>();

    const sessionToken =
      request.cookies[SESSION_COOKIE_NAME];

    if (!sessionToken) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    const sessionTokenHash = createHash('sha256')
      .update(sessionToken)
      .digest('hex');

    const session =
      await this.sessionsRepository.findValidByTokenHash(
        sessionTokenHash,
      );

    if (!session) {
      throw new UnauthorizedException(
        'Invalid or expired session.',
      );
    }

    const user =
      await this.usersRepository.findById(session.userId);

    if (!user) {
      throw new UnauthorizedException(
        'User is no longer available.',
      );
    }

    request.user = user;

    return true;
  }
}