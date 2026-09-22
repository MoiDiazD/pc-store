import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import cookie from '@fastify/cookie';
import { AppModule } from '../../../src/app.module';
import { PostgresExceptionFilter } from '../../../src/common/filters/postgres-exception.filter';
import { StripePaymentProvider } from '../../../src/payments/stripe-payment.provider';
import { db } from '../../helpers/database';
import { users } from '../../../src/database/schema';
import { eq } from 'drizzle-orm';

export type E2eApp = NestFastifyApplication;

const fakeStripeProvider = {
  async createPayment(params: { amount: number; currency: string; metadata: Record<string, string> }) {
    return {
      providerPaymentId: `e2e-payment-${params.metadata.orderId}`,
      clientSecret: `e2e-client-secret-${params.metadata.orderId}`,
    };
  },
  constructWebhookEvent() {
    throw new Error('Webhook signing is not used by these E2E tests.');
  },
  async cancelPayment() {
    return {} as never;
  },
};

export async function createE2eApp(): Promise<E2eApp> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(StripePaymentProvider)
    .useValue(fakeStripeProvider)
    .compile();

  const app = moduleFixture.createNestApplication<E2eApp>(
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

  return app;
}

export async function promoteToManager(email: string): Promise<void> {
  await db.update(users).set({ role: 'manager' }).where(eq(users.email, email));
}

export async function registerAndLogin(
  app: E2eApp,
  email: string,
  name = 'E2E User',
) {
  const server = app.getHttpAdapter().getInstance();

  const registerResponse = await server.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      name,
      email,
      password: 'password123',
    },
  });

  if (registerResponse.statusCode !== 201) {
    throw new Error(
      `Registration failed: ${registerResponse.statusCode} ${registerResponse.body}`,
    );
  }

  const loginResponse = await server.inject({
    method: 'POST',
    url: '/auth/login',
    payload: {
      email,
      password: 'password123',
    },
  });

  if (loginResponse.statusCode !== 201) {
    throw new Error(
      `Login failed: ${loginResponse.statusCode} ${loginResponse.body}`,
    );
  }

  const sessionCookie = loginResponse.cookies.find(
    ({ name }) => name === 'session',
  );

  if (!sessionCookie?.value) {
    throw new Error('Login did not return a session cookie.');
  }

  return sessionCookie.value;
}
