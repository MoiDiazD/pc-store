import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthAccessModule } from './auth-access-module';

@Module({
  imports: [UsersModule, AuthAccessModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
