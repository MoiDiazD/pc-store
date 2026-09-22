import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createE2eApp, promoteToManager, registerAndLogin } from './helpers/app';

describe('Commerce E2E', () => {
  let app: Awaited<ReturnType<typeof createE2eApp>>;
  let server: ReturnType<typeof app.getHttpAdapter>['getInstance'];

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await app.close();
  });

  it('protects the cart and manages cart items through HTTP', async () => {
    const unauthorized = await server.inject({
      method: 'GET',
      url: '/cart',
    });
    expect(unauthorized.statusCode).toBe(401);

    const cookie = await registerAndLogin(
      app,
      'e2e-cart@example.com',
      'Cart User',
    );

    const manager = await registerAndLogin(
      app,
      'e2e-cart-manager@example.com',
      'Cart Manager',
    );
    await promoteToManager('e2e-resource-manager@example.com');

    const brand = await server.inject({
      method: 'POST',
      url: '/brands',
      cookies: { session: manager },
      payload: { name: 'E2E Cart Brand' },
    });
    expect(brand.statusCode).toBe(201);

    const product = await server.inject({
      method: 'POST',
      url: '/products',
      cookies: { session: manager },
      payload: {
        name: 'E2E Cart Product',
        model: 'CART-1',
        price: '50.00',
        stock: 5,
        brandId: brand.json().id,
      },
    });
    expect(product.statusCode).toBe(201);

    const initialCart = await server.inject({
      method: 'GET',
      url: '/cart',
      cookies: { session: cookie },
    });
    expect(initialCart.statusCode).toBe(200);
    expect(initialCart.json().items).toEqual([]);

    const added = await server.inject({
      method: 'POST',
      url: '/cart/items',
      cookies: { session: cookie },
      payload: { productId: product.json().id, quantity: 2 },
    });
    expect(added.statusCode).toBe(201);
    expect(added.json()).toMatchObject({
      productId: product.json().id,
      quantity: 2,
    });

    const updated = await server.inject({
      method: 'PATCH',
      url: `/cart/items/${product.json().id}`,
      cookies: { session: cookie },
      payload: { quantity: 3 },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().quantity).toBe(3);

    const cart = await server.inject({
      method: 'GET',
      url: '/cart',
      cookies: { session: cookie },
    });
    expect(cart.json().items).toHaveLength(1);
    expect(cart.json().items[0]).toMatchObject({
      productId: product.json().id,
      quantity: 3,
    });

    const removed = await server.inject({
      method: 'DELETE',
      url: `/cart/items/${product.json().id}`,
      cookies: { session: cookie },
    });
    expect(removed.statusCode).toBe(200);

    const emptyCart = await server.inject({
      method: 'GET',
      url: '/cart',
      cookies: { session: cookie },
    });
    expect(emptyCart.json().items).toEqual([]);
  });

  it('runs the checkout flow and creates a pending order without calling real Stripe', async () => {
    const customer = await registerAndLogin(
      app,
      'e2e-checkout@example.com',
      'Checkout User',
    );

    const manager = await registerAndLogin(
      app,
      'e2e-checkout-manager@example.com',
      'Checkout Manager',
    );
    await promoteToManager('e2e-resource-manager@example.com');

    const brand = await server.inject({
      method: 'POST',
      url: '/brands',
      cookies: { session: manager },
      payload: { name: 'E2E Checkout Brand' },
    });
    const product = await server.inject({
      method: 'POST',
      url: '/products',
      cookies: { session: manager },
      payload: {
        name: 'E2E Checkout Product',
        model: 'CHECKOUT-1',
        price: '25.00',
        stock: 4,
        brandId: brand.json().id,
      },
    });

    await server.inject({
      method: 'POST',
      url: '/cart/items',
      cookies: { session: customer },
      payload: { productId: product.json().id, quantity: 2 },
    });

    const checkout = await server.inject({
      method: 'POST',
      url: '/orders/checkout',
      cookies: { session: customer },
    });

    expect(checkout.statusCode).toBe(201);
    expect(checkout.json()).toMatchObject({
      provider: 'stripe',
      clientSecret: expect.stringContaining('e2e-client-secret-'),
    });
    expect(checkout.json().orderId).toBeTypeOf('number');

    const orders = await server.inject({
      method: 'GET',
      url: '/orders',
      cookies: { session: customer },
    });
    expect(orders.statusCode).toBe(200);
    expect(orders.json()).toHaveLength(1);
    expect(orders.json()[0]).toMatchObject({
      id: checkout.json().orderId,
      status: 'pending',
      total: '50.00',
    });
    expect(orders.json()[0].items).toHaveLength(1);
    expect(orders.json()[0].items[0]).toMatchObject({
      quantity: 2,
      unitPrice: '25.00',
    });

    const order = await server.inject({
      method: 'GET',
      url: `/orders/${checkout.json().orderId}`,
      cookies: { session: customer },
    });
    expect(order.statusCode).toBe(200);
    expect(order.json()).toMatchObject({
      id: checkout.json().orderId,
      status: 'pending',
    });
  });

  it('does not allow a user to read another user\'s order', async () => {
    const firstUser = await registerAndLogin(
      app,
      'e2e-order-owner@example.com',
      'Order Owner',
    );

    const secondUser = await registerAndLogin(
      app,
      'e2e-order-other@example.com',
      'Other User',
    );

    const manager = await registerAndLogin(
      app,
      'e2e-order-manager@example.com',
      'Order Manager',
    );
    await promoteToManager('e2e-resource-manager@example.com');

    const brand = await server.inject({
      method: 'POST',
      url: '/brands',
      cookies: { session: manager },
      payload: { name: 'E2E Order Brand' },
    });
    const product = await server.inject({
      method: 'POST',
      url: '/products',
      cookies: { session: manager },
      payload: {
        name: 'E2E Order Product',
        model: 'ORDER-1',
        price: '10.00',
        stock: 2,
        brandId: brand.json().id,
      },
    });

    await server.inject({
      method: 'POST',
      url: '/cart/items',
      cookies: { session: firstUser },
      payload: { productId: product.json().id, quantity: 1 },
    });

    const checkout = await server.inject({
      method: 'POST',
      url: '/orders/checkout',
      cookies: { session: firstUser },
    });
    expect(checkout.statusCode).toBe(201);

    const forbidden = await server.inject({
      method: 'GET',
      url: `/orders/${checkout.json().orderId}`,
      cookies: { session: secondUser },
    });
    expect(forbidden.statusCode).toBe(404);
  });
});
