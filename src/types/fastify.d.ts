import type { users } from '../database/schema';

type User = typeof users.$inferSelect;

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}