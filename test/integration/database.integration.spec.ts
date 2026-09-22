import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { db } from '../helpers/database';

describe('Database integration', () => {
  it('connects to the test database', async () => {
    const result = await db.execute(
      sql`SELECT current_database() AS database`,
    );

    expect(result.rows[0]).toEqual({
      database: 'pcstore_test',
    });
  });
});