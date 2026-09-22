import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../helpers/database';
import { resetDatabase } from '../helpers/reset-database';
import { CartItemsRepository } from '../../src/cart/cart-items.repository';
import { CartRepository } from '../../src/cart/cart.repository';
import { ProductsRepository } from '../../src/products/products.repository';
import { BrandsRepository } from '../../src/brands/brands.repository';

describe('CartItemsRepository integration', () => {
  const repository = new CartItemsRepository(db);
  const carts = new CartRepository(db);
  const products = new ProductsRepository(db);
  const brands = new BrandsRepository(db);

  beforeEach(() => resetDatabase());

  async function createCartAndProduct() {
    const user = await db.insert((await import('../../src/database/schema')).users).values({
      name: 'User',
      email: 'cart-item@example.com',
      passwordHash: 'hash',
      role: 'customer',
    }).returning();
    const cart = await carts.create(user[0].id);
    const brand = await brands.create({ name: 'NVIDIA' });
    const product = await products.create({
      name: 'RTX 5070',
      model: 'RTX-5070',
      description: 'GPU',
      price: '599.99',
      stock: 10,
      brandId: brand.id,
    });
    return { cart, product };
  }

  it('creates, finds, updates and removes cart items', async () => {
    const { cart, product } = await createCartAndProduct();

    const item = await repository.create({ cartId: cart.id, productId: product.id, quantity: 2 });
    expect(await repository.findByCartAndProduct(cart.id, product.id)).toMatchObject({ id: item.id, quantity: 2 });
    expect(await repository.findByCartId(cart.id)).toHaveLength(1);

    expect((await repository.updateQuantity(item.id, 4))?.quantity).toBe(4);
    expect(await repository.remove(cart.id, product.id)).toBe(true);
    expect(await repository.remove(cart.id, product.id)).toBe(false);
  });

  it('returns detailed active products and removes all items by cart', async () => {
    const { cart, product } = await createCartAndProduct();
    const deleted = await products.create({
      name: 'Deleted GPU',
      model: 'OLD',
      description: null,
      price: '10.00',
      stock: 1,
      brandId: product.brandId,
    });
    await repository.create({ cartId: cart.id, productId: product.id, quantity: 2 });
    await repository.create({ cartId: cart.id, productId: deleted.id, quantity: 1 });
    await products.softDelete(deleted.id);

    const detailed = await repository.findDetailedByCartId(cart.id);
    expect(detailed).toHaveLength(1);
    expect(detailed[0]).toMatchObject({
      product: { id: product.id, name: 'RTX 5070' },
      quantity: 2,
    });

    await repository.removeByCartId(cart.id);
    expect(await repository.findByCartId(cart.id)).toHaveLength(0);
  });
});
