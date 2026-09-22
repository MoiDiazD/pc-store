import { afterAll } from 'vitest';
import { config } from 'dotenv';

import { pool } from '../helpers/database';

config({
  path: '.env.test',
  override: true,
});

afterAll(async () => {
  await pool.end();
});
