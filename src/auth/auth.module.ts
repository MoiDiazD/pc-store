import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionsRepository,
    AuthGuard,
  ],
})
export class AuthModule {}