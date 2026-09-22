import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    include: ['test/e2e/**/*.e2e-spec.ts'],
    setupFiles: ['test/e2e/setup.ts'],
  },
});
