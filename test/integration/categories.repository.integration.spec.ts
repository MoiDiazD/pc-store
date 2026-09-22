import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../helpers/database';
import { resetDatabase } from '../helpers/reset-database';
import { CategoriesRepository } from '../../src/categories/categories.repository';
import { BrandsRepository } from '../../src/brands/brands.repository';
import { ProductsRepository } from '../../src/products/products.repository';

describe('CategoriesRepository integration', () => {
  const repository = new CategoriesRepository(db);
  const brands = new BrandsRepository(db);
  const products = new ProductsRepository(db);

  beforeEach(() => resetDatabase());

  it('creates, finds, updates, soft-deletes and restores a category', async () => {
    const category = await repository.create({ name: 'Graphics Cards' });

    expect(await repository.findById(category.id)).toMatchObject({ id: category.id, name: 'Graphics Cards' });
    expect((await repository.findAll())).toHaveLength(1);

    expect((await repository.update(category.id, { name: 'GPUs' }))?.name).toBe('GPUs');
    expect((await repository.softDelete(category.id))?.deletedAt).toBeInstanceOf(Date);
    expect(await repository.findById(category.id)).toBeUndefined();

    expect((await repository.restore(category.id))?.deletedAt).toBeNull();
    expect((await repository.findById(category.id))?.name).toBe('GPUs');
  });

  it('finds non-deleted products in a category', async () => {
    const brand = await brands.create({ name: 'NVIDIA' });
    const category = await repository.create({ name: 'GPUs' });
    const visible = await products.create({
      name: 'RTX 5070',
      model: 'RTX-5070',
      description: 'GPU',
      price: '599.99',
      stock: 10,
      brandId: brand.id,
    });
    const deleted = await products.create({
      name: 'Old GPU',
      model: 'OLD-1',
      description: null,
      price: '100.00',
      stock: 1,
      brandId: brand.id,
    });

    await db.insert((await import('../../src/database/schema')).productCategories).values([
      { productId: visible.id, categoryId: category.id },
      { productId: deleted.id, categoryId: category.id },
    ]);
    await products.softDelete(deleted.id);

    const result = await repository.findProductsByCategoryId(category.id);
    expect(result.map((product) => product.id)).toEqual([visible.id]);
  });
});
