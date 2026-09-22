import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createE2eApp } from './helpers/app';

describe('Payments E2E', () => {
  let app: Awaited<ReturnType<typeof createE2eApp>>;
  let server: FastifyInstance;

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a webhook request without a signature as an unprocessed event', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/payments/webhook',
      payload: {
        type: 'payment_intent.succeeded',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      received: false,
    });
  });
});
