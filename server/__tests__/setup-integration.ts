import 'server-only';

import { afterAll, beforeEach } from 'vitest';
import { db } from '@/server/db/client';
import { resetTestDb } from '@/server/__tests__/helpers/db-test-utils';

if (!process.env.DATABASE_URL_TEST && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL_TEST or DATABASE_URL is required to run integration tests.');
}

beforeEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await db.$disconnect();
});
