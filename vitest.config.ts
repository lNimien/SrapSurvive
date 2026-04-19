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
    include: [
      'server/domain/**/__tests__/**/*.test.ts',
      'server/services/**/__tests__/**/*.test.ts',
      'server/auth/**/__tests__/**/*.test.ts',
      'lib/**/__tests__/**/*.test.ts',
    ],
    exclude: ['server/__tests__/**'],
  },
});
