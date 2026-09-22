import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import cookie from '@fastify/cookie';
import request from 'supertest';
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a customer through the real HTTP stack', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'E2E User',
        email: 'e2e-register@example.com',
        password: 'password123',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'E2E User',
      email: 'e2e-register@example.com',
      role: 'customer',
    });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('logs in, uses the session cookie, and accesses the authenticated user', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'E2E Login User',
        email: 'e2e-login@example.com',
        password: 'password123',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'E2E-LOGIN@EXAMPLE.COM',
        password: 'password123',
      })
      .expect(201);

    expect(loginResponse.body).toMatchObject({
      email: 'e2e-login@example.com',
      role: 'customer',
    });

    const cookies = loginResponse.headers['set-cookie'];

    expect(cookies).toBeDefined();
    expect(cookies.join(';')).toContain('session=');

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookies)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          name: 'E2E Login User',
          email: 'e2e-login@example.com',
          role: 'customer',
        });
      });
  });

  it('rejects protected requests without authentication', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });

  it('revokes the session on logout', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'E2E Logout User',
        email: 'e2e-logout@example.com',
        password: 'password123',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'e2e-logout@example.com',
        password: 'password123',
      })
      .expect(201);

    const cookies = loginResponse.headers['set-cookie'];

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookies)
      .expect(201);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookies)
      .expect(401);
  });
});
