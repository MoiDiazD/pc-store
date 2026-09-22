import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    include: ['test/integration/**/*.spec.ts'],
    setupFiles: ['test/integration/setup.ts'],
  },
});
