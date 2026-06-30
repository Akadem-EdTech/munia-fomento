import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      SESSION_SECRET: 'test-secret-suficientemente-largo',
      DATABASE_URL: 'postgresql://munia:munia@localhost:5432/munia_test?schema=public',
      WEB_ORIGIN: 'http://localhost:5173',
    },
  },
});
