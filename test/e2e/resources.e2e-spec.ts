import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createE2eApp, promoteToManager, registerAndLogin } from './helpers/app';

describe('Resources E2E', () => {
  let app: Awaited<ReturnType<typeof createE2eApp>>;
  let server: ReturnType<typeof app.getHttpAdapter>['getInstance'];

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves public brands, categories, and products', async () => {
    const brands = await server.inject({
      method: 'GET',
      url: '/brands',
    });
    expect(brands.statusCode).toBe(200);
    expect(brands.json()).toEqual([]);

    const categories = await server.inject({
      method: 'GET',
      url: '/categories',
    });
    expect(categories.statusCode).toBe(200);
    expect(categories.json()).toEqual([]);

    const products = await server.inject({
      method: 'GET',
      url: '/products',
    });
    expect(products.statusCode).toBe(200);
    expect(products.json()).toEqual([]);
  });

  it('allows only managers to manage brands and categories', async () => {
    const customerCookie = await registerAndLogin(
      app,
      'e2e-resource-customer@example.com',
      'Resource Customer',
    );

    const customerBrand = await server.inject({
      method: 'POST',
      url: '/brands',
      cookies: { session: customerCookie },
      payload: { name: 'Customer Brand' },
    });
    expect(customerBrand.statusCode).toBe(403);

    const customerCategory = await server.inject({
      method: 'POST',
      url: '/categories',
      cookies: { session: customerCookie },
      payload: { name: 'Customer Category' },
    });
    expect(customerCategory.statusCode).toBe(403);

    const managerCookie = await registerAndLogin(
      app,
      'e2e-resource-manager@example.com',
      'Resource Manager',
    );

    await promoteToManager('e2e-resource-manager@example.com');

    const brand = await server.inject({
      method: 'POST',
      url: '/brands',
      cookies: { session: managerCookie },
      payload: { name: 'E2E Brand' },
    });
    expect(brand.statusCode).toBe(201);

    const category = await server.inject({
      method: 'POST',
      url: '/categories',
      cookies: { session: managerCookie },
      payload: { name: 'E2E Category' },
    });
    expect(category.statusCode).toBe(201);
  });

  it('enforces product roles and exposes the created product publicly', async () => {
    const customerCookie = await registerAndLogin(
      app,
      'e2e-product-customer@example.com',
      'Product Customer',
    );

    const forbidden = await server.inject({
      method: 'POST',
      url: '/products',
      cookies: { session: customerCookie },
      payload: {
        name: 'Forbidden Product',
        model: 'FORBIDDEN-1',
        price: '100.00',
        stock: 5,
        brandId: 1,
      },
    });
    expect(forbidden.statusCode).toBe(403);

    const managerCookie = await registerAndLogin(
      app,
      'e2e-product-manager@example.com',
      'Product Manager',
    );

    await promoteToManager('e2e-product-manager@example.com');

    const brand = await server.inject({
      method: 'POST',
      url: '/brands',
      cookies: { session: managerCookie },
      payload: { name: 'E2E Product Brand' },
    });
    expect(brand.statusCode).toBe(201);

    const product = await server.inject({
      method: 'POST',
      url: '/products',
      cookies: { session: managerCookie },
      payload: {
        name: 'E2E RTX',
        model: 'RTX-E2E',
        description: 'E2E product',
        price: '999.99',
        stock: 5,
        brandId: brand.json().id,
      },
    });

    expect(product.statusCode).toBe(201);
    expect(product.json()).toMatchObject({
      name: 'E2E RTX',
      model: 'RTX-E2E',
      price: '999.99',
      stock: 5,
    });

    const productId = product.json().id;

    const publicProduct = await server.inject({
      method: 'GET',
      url: `/products/${productId}`,
    });
    expect(publicProduct.statusCode).toBe(200);
    expect(publicProduct.json().id).toBe(productId);

    const updated = await server.inject({
      method: 'PATCH',
      url: `/products/${productId}`,
      cookies: { session: managerCookie },
      payload: { stock: 8 },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().stock).toBe(8);

    const deleted = await server.inject({
      method: 'DELETE',
      url: `/products/${productId}`,
      cookies: { session: managerCookie },
    });
    expect(deleted.statusCode).toBe(200);

    const missing = await server.inject({
      method: 'GET',
      url: `/products/${productId}`,
    });
    expect(missing.statusCode).toBe(404);

    const restored = await server.inject({
      method: 'PATCH',
      url: `/products/${productId}/restore`,
      cookies: { session: managerCookie },
    });
    expect(restored.statusCode).toBe(200);
  });
});
