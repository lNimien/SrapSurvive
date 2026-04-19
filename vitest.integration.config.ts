import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': path.resolve(__dirname, 'test/mocks/noop.ts'),
      'client-only': path.resolve(__dirname, 'test/mocks/noop.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['server/__tests__/**/*.test.ts'],
    setupFiles: ['server/__tests__/setup-integration.ts'],
  },
});
