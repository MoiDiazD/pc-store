import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { UsersRepository } from '../users/users.repository';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
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
}