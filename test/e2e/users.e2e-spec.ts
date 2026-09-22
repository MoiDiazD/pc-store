import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createE2eApp, registerAndLogin } from './helpers/app';

describe('Users E2E', () => {
  let app: Awaited<ReturnType<typeof createE2eApp>>;
  let server: FastifyInstance;

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows a user to read and update their own profile', async () => {
    const cookie = await registerAndLogin(
      app,
      'e2e-user@example.com',
      'Original Name',
    );

    const me = await server.inject({
      method: 'GET',
      url: '/users/me',
      cookies: { session: cookie },
    });

    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({
      name: 'Original Name',
      email: 'e2e-user@example.com',
      role: 'customer',
    });

    const updated = await server.inject({
      method: 'PATCH',
      url: '/users/me',
      cookies: { session: cookie },
      payload: {
        name: 'Updated Name',
        email: 'updated@example.com',
      },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      name: 'Updated Name',
      email: 'updated@example.com',
    });
  });

  it('allows a user to change their password and invalidates existing sessions', async () => {
    const cookie = await registerAndLogin(
      app,
      'e2e-password@example.com',
      'Password User',
    );

    const changed = await server.inject({
      method: 'PATCH',
      url: '/auth/change-password',
      cookies: { session: cookie },
      payload: {
        currentPassword: 'password123',
        newPassword: 'newPassword123',
      },
    });

    expect(changed.statusCode).toBe(204);

    const oldSessionMe = await server.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { session: cookie },
    });
    expect(oldSessionMe.statusCode).toBe(401);

    const oldPasswordLogin = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'e2e-password@example.com',
        password: 'password123',
      },
    });
    expect(oldPasswordLogin.statusCode).toBe(401);

    const newPasswordLogin = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'e2e-password@example.com',
        password: 'newPassword123',
      },
    });
    expect(newPasswordLogin.statusCode).toBe(201);
  });
});
