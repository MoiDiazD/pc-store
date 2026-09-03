import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';
import type { Database } from '../database/database.provider';

import { sessions } from '../database/schema';

type Session = typeof sessions.$inferSelect;

@Injectable()
export class SessionsRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {}

  async create(
    data: typeof sessions.$inferInsert,
  ): Promise<Session> {
    const [session] = await this.db
      .insert(sessions)
      .values(data)
      .returning();

    return session;
  }

  async findValidByTokenHash(
    tokenHash: string,
  ): Promise<Session | undefined> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      );

    return session;
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(sessions.id, tokenHash),
          isNull(sessions.revokedAt),
        ),
      );
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
        ),
      );
  }
}