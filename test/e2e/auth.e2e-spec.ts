import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import cookie from '@fastify/cookie';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module';
import { PostgresExceptionFilter } from '../../src/common/filters/postgres-exception.filter';

describe('Auth E2E', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.register(cookie);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new PostgresExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a customer through the real HTTP stack', async () => {
    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'E2E User',
        email: 'e2e-register@example.com',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      name: 'E2E User',
      email: 'e2e-register@example.com',
      role: 'customer',
    });
    expect(response.json()).not.toHaveProperty('password');
    expect(response.json()).not.toHaveProperty('passwordHash');
  });

  it('validates DTOs and strips unknown properties', async () => {
    const invalid = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'A',
        email: 'not-an-email',
        password: 'short',
        unexpected: 'removed',
      },
    });

    expect(invalid.statusCode).toBe(400);

    const valid = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Validation User',
        email: 'validation@example.com',
        password: 'password123',
        unexpected: 'removed',
      },
    });

    expect(valid.statusCode).toBe(201);
    expect(valid.json()).not.toHaveProperty('unexpected');
  });

  it('logs in, uses the session cookie, and accesses the authenticated user', async () => {
    await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'E2E Login User',
        email: 'e2e-login@example.com',
        password: 'password123',
      },
    });

    const loginResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'E2E-LOGIN@EXAMPLE.COM',
          password: 'password123',
        },
      });

    expect(loginResponse.statusCode).toBe(201);
    expect(loginResponse.json()).toMatchObject({
      email: 'e2e-login@example.com',
      role: 'customer',
    });

    const sessionCookie = loginResponse.cookies.find(
      ({ name }) => name === 'session',
    );

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.value).toBeTruthy();

    const meResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'GET',
        url: '/auth/me',
        cookies: {
          session: sessionCookie!.value,
        },
      });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json()).toMatchObject({
      name: 'E2E Login User',
      email: 'e2e-login@example.com',
      role: 'customer',
    });
  });

  it('rejects protected requests without authentication', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'GET',
        url: '/auth/me',
      });

    expect(response.statusCode).toBe(401);
  });

  it('revokes the session on logout', async () => {
    await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'E2E Logout User',
        email: 'e2e-logout@example.com',
        password: 'password123',
      },
    });

    const loginResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'e2e-logout@example.com',
          password: 'password123',
        },
      });

    const sessionCookie = loginResponse.cookies.find(
      ({ name }) => name === 'session',
    );

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.value).toBeTruthy();

    const logoutResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'POST',
        url: '/auth/logout',
        cookies: {
          session: sessionCookie!.value,
        },
      });

    expect(logoutResponse.statusCode).toBe(201);

    const meResponse = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: 'GET',
        url: '/auth/me',
        cookies: {
          session: sessionCookie!.value,
        },
      });

    expect(meResponse.statusCode).toBe(401);
  });
});
