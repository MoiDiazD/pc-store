import { describe, expect, it, beforeEach } from 'vitest';

import { db } from '../helpers/database';
import { resetDatabase } from '../helpers/reset-database';
import { BrandsRepository } from '../../src/brands/brands.repository';

describe('BrandsRepository integration', () => {
  const repository = new BrandsRepository(db);

  beforeEach(() => resetDatabase());

  it('creates and finds a brand', async () => {
    const created = await repository.create({ name: 'NVIDIA' });

    expect(created.name).toBe('NVIDIA');
    expect(await repository.findById(created.id)).toMatchObject({ id: created.id, name: 'NVIDIA' });
  });

  it('finds only non-deleted brands', async () => {
    const active = await repository.create({ name: 'AMD' });
    const deleted = await repository.create({ name: 'Intel' });
    await repository.softDelete(deleted.id);

    expect((await repository.findAll()).map((brand) => brand.id)).toEqual([active.id]);
    expect(await repository.findById(deleted.id)).toBeUndefined();
  });

  it('updates, soft-deletes and restores a brand', async () => {
    const brand = await repository.create({ name: 'ASUS' });

    const updated = await repository.update(brand.id, { name: 'ASUS ROG' });
    expect(updated?.name).toBe('ASUS ROG');

    const deleted = await repository.softDelete(brand.id);
    expect(deleted?.deletedAt).toBeInstanceOf(Date);
    expect(await repository.update(brand.id, { name: 'ASUS ROG STRIX' })).toBeUndefined();

    const restored = await repository.restore(brand.id);
    expect(restored?.deletedAt).toBeNull();
    expect((await repository.findById(brand.id))?.name).toBe('ASUS ROG');
  });
});
