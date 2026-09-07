import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';
import type { Database } from '../database/database.provider';

import { users } from '../database/schema';

import { BaseRepository } from '../database/repositories/base.repository';
import { UserRole } from './user-role.type';

type User = typeof users.$inferSelect;

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {
    super();
  }

  async create(data: typeof users.$inferInsert): Promise<User> {
    const [user] = await this.db
      .insert(users)
        .values(data)
          .returning();

    return user;
  }

  async findById(id: number): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          isNull(users.deletedAt),
        ),
      );

    return user;
  }

  async findAll(): Promise<User[]> {
    return this.db
      .select()
      .from(users)
      .where(isNull(users.deletedAt));
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          isNull(users.deletedAt),
        ),
      );

    return user;
  }

  async softDelete(id: number): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(users.id, id),
          isNull(users.deletedAt),
        ),
      )
      .returning();

    return user;
  }

  async restore(id: number): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({
        deletedAt: null,
      })
      .where(eq(users.id, id))
      .returning();

    return user;
  }

  async update(
    id: number,
    data: Partial<typeof users.$inferInsert>,
  ): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(users.id, id),
          isNull(users.deletedAt),
        ),
      )
      .returning();

    return user;
  }

  async updatePassword(
    id: number,
    passwordHash: string,
  ): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(users.id, id),
          isNull(users.deletedAt),
        ),
      )
      .returning();

    return user;
  }

  async updateRole(
      id: number,
      role: UserRole,
    ): Promise<User | undefined> {
      const [user] = await this.db
        .update(users)
        .set({
          role,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(users.id, id),
            isNull(users.deletedAt),
          ),
        )
        .returning();

      return user;
    }
}