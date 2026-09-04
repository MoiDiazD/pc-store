import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { SessionsRepository } from './sessions.repository';
import { RoleGuard } from './roles.guard';
import { AuthAccessModule } from './auth-access-module';

@Module({
   imports: [
    UsersModule,
    AuthAccessModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
  ],
})
export class AuthModule {}