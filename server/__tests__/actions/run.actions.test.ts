import 'server-only';

import { describe, expect, it, vi } from 'vitest';

import { seedTestRun, seedTestUser } from '@/server/__tests__/helpers/db-test-utils';

vi.mock('@/server/auth/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from '@/server/auth/auth';
import { requestExtractionAction } from '@/server/actions/run.actions';

describe('requestExtractionAction ownership/security', () => {
  it('returns UNAUTHORIZED when session user attempts to extract another user run', async () => {
    await seedTestUser('user-A');
    await seedTestUser('user-B');

    const { runId } = await seedTestRun({ userId: 'user-A', startedAt: new Date(Date.now() - 120_000) });

    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-B' } } as never);

    const result = await requestExtractionAction({ runId });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected an unauthorized ActionResult error.');
    }
    expect(result.error.code).toBe('UNAUTHORIZED');
  });
});
