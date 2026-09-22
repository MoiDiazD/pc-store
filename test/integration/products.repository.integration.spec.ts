import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../helpers/database';
import { resetDatabase } from '../helpers/reset-database';
import { BrandsRepository } from '../../src/brands/brands.repository';
import { ProductsRepository } from '../../src/products/products.repository';

describe('ProductsRepository integration', () => {
  const repository = new ProductsRepository(db);
  const brands = new BrandsRepository(db);

  beforeEach(() => resetDatabase());

  async function createProduct(stock = 10) {
    const brand = await brands.create({ name: 'NVIDIA' });
    return repository.create({
      name: 'RTX 5070',
      model: 'RTX-5070',
      description: 'GPU',
      price: '599.99',
      stock,
      brandId: brand.id,
    });
  }

  it('creates, finds and updates a product', async () => {
    const product = await createProduct();

    expect(await repository.findById(product.id)).toMatchObject({ id: product.id, name: 'RTX 5070' });
    expect((await repository.findAll())).toHaveLength(1);

    const updated = await repository.update(product.id, { price: '649.99', stock: 8 });
    expect(updated?.price).toBe('649.99');
    expect(updated?.stock).toBe(8);
  });

  it('soft-deletes and restores a product', async () => {
    const product = await createProduct();

    expect((await repository.softDelete(product.id))?.deletedAt).toBeInstanceOf(Date);
    expect(await repository.findById(product.id)).toBeUndefined();

    expect((await repository.restore(product.id))?.deletedAt).toBeNull();
    expect(await repository.findById(product.id)).toBeDefined();
  });

  it('decrements stock only when enough stock is available', async () => {
    const product = await createProduct(5);

    expect((await repository.decrementStockIfAvailable(product.id, 3))?.stock).toBe(2);
    expect(await repository.decrementStockIfAvailable(product.id, 3)).toBeUndefined();
    expect((await repository.findById(product.id))?.stock).toBe(2);
  });

  it('increments stock', async () => {
    const product = await createProduct(5);

    expect((await repository.incrementStock(product.id, 4))?.stock).toBe(9);
  });

  it('does not update or decrement a deleted product', async () => {
    const product = await createProduct(5);
    await repository.softDelete(product.id);

    expect(await repository.update(product.id, { stock: 1 })).toBeUndefined();
    expect(await repository.decrementStockIfAvailable(product.id, 1)).toBeUndefined();
    expect(await repository.incrementStock(product.id, 1)).toBeDefined();
  });
});
