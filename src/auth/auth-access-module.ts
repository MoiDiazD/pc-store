import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

import { AuthGuard } from './auth.guard';
import { RoleGuard } from './roles.guard';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
  ],
  providers: [
    SessionsRepository,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
  exports: [
    SessionsRepository,
  ],
})
export class AuthAccessModule {}