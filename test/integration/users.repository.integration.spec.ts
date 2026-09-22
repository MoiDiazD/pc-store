import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../helpers/database';
import { resetDatabase } from '../helpers/reset-database';
import { UsersRepository } from '../../src/users/users.repository';

describe('UsersRepository integration', () => {
  const repository = new UsersRepository(db);

  beforeEach(() => resetDatabase());

  async function createUser(email = 'user@example.com') {
    return repository.create({
      name: 'Test User',
      email,
      passwordHash: 'hash',
      role: 'customer',
    });
  }

  it('creates and finds users by id and email', async () => {
    const user = await createUser();

    expect(await repository.findById(user.id)).toMatchObject({ id: user.id, email: user.email });
    expect(await repository.findByEmail(user.email)).toMatchObject({ id: user.id });
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('updates profile, password and role', async () => {
    const user = await createUser();

    expect((await repository.update(user.id, { name: 'Updated' }))?.name).toBe('Updated');
    expect((await repository.updatePassword(user.id, 'new-hash'))?.passwordHash).toBe('new-hash');
    expect((await repository.updateRole(user.id, 'manager'))?.role).toBe('manager');
  });

  it('soft-deletes and restores users', async () => {
    const user = await createUser();

    expect((await repository.softDelete(user.id))?.deletedAt).toBeInstanceOf(Date);
    expect(await repository.findById(user.id)).toBeUndefined();
    expect(await repository.findByEmail(user.email)).toBeUndefined();

    expect((await repository.restore(user.id))?.deletedAt).toBeNull();
    expect(await repository.findByEmail(user.email)).toBeDefined();
  });
});
