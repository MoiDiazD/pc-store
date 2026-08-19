import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DATABASE = 'DATABASE';
export type Database = ReturnType<typeof createDatabase>;

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

