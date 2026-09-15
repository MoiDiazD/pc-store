import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DATABASE = 'DATABASE';

const createDatabase = () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  return drizzle(pool, { schema });
};

export const databaseProvider = {
  provide: DATABASE,
  useFactory: createDatabase,
};

export type Database = ReturnType<typeof createDatabase>;

export type DatabaseTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];