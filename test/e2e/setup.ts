import { afterAll, beforeEach } from 'vitest';
import { config } from 'dotenv';

import { pool } from '../helpers/database';
import { resetDatabase } from '../helpers/reset-database';

config({
  path: '.env.test',
  override: true,
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await pool.end();
});
