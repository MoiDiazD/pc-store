import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionsRepository } from './sessions.repository';
import { SESSION_DURATION_MS } from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser =
      await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException(
        'A user with this email already exists.',
      );
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const user = await this.usersRepository.create({
      name: dto.name.trim(),
      email,
      passwordHash,
      role: 'customer',
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user =
      await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials.',
      );
    }

    const passwordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException(
        'Invalid credentials.',
      );
    }

    const sessionToken = randomBytes(32).toString('hex');

    const sessionTokenHash = createHash('sha256')
      .update(sessionToken)
      .digest('hex');

    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_MS,
    );

    await this.sessionsRepository.create({
      id: sessionTokenHash,
      userId: user.id,
      expiresAt,
    });

    return {
      sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}