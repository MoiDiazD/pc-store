import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../helpers/database';
import { resetDatabase } from '../helpers/reset-database';
import { SessionsRepository } from '../../src/auth/sessions.repository';
import { UsersRepository } from '../../src/users/users.repository';

describe('SessionsRepository integration', () => {
  const repository = new SessionsRepository(db);
  const users = new UsersRepository(db);

  beforeEach(() => resetDatabase());

  it('creates and finds a valid session', async () => {
    const user = await users.create({
      name: 'User',
      email: 'session@example.com',
      passwordHash: 'hash',
      role: 'customer',
    });

    const session = await repository.create({
      id: 'token-hash',
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });

    expect(await repository.findValidByTokenHash(session.id)).toMatchObject({ id: session.id });
  });

  it('does not return expired or revoked sessions', async () => {
    const user = await users.create({
      name: 'User',
      email: 'session@example.com',
      passwordHash: 'hash',
      role: 'customer',
    });

    await repository.create({
      id: 'expired',
      userId: user.id,
      expiresAt: new Date(Date.now() - 60_000),
    });
    const revoked = await repository.create({
      id: 'revoked',
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await repository.revoke(revoked.id);

    expect(await repository.findValidByTokenHash('expired')).toBeUndefined();
    expect(await repository.findValidByTokenHash('revoked')).toBeUndefined();
  });

  it('revokes one session and all active sessions for a user', async () => {
    const user = await users.create({
      name: 'User',
      email: 'session@example.com',
      passwordHash: 'hash',
      role: 'customer',
    });

    await repository.create({ id: 'one', userId: user.id, expiresAt: new Date(Date.now() + 60_000) });
    await repository.create({ id: 'two', userId: user.id, expiresAt: new Date(Date.now() + 60_000) });

    expect((await repository.revoke('one'))?.revokedAt).toBeInstanceOf(Date);
    await repository.revokeAllForUser(user.id);

    expect(await repository.findValidByTokenHash('one')).toBeUndefined();
    expect(await repository.findValidByTokenHash('two')).toBeUndefined();
  });
});
