import 'server-only';

import { afterEach, describe, expect, it } from 'vitest';

import { isAdminUser } from '@/server/auth/admin';

const originalAdminIds = process.env.ADMIN_USER_IDS;

afterEach(() => {
  process.env.ADMIN_USER_IDS = originalAdminIds;
});

describe('isAdminUser', () => {
  it('returns true only for IDs present in ADMIN_USER_IDS', () => {
    process.env.ADMIN_USER_IDS = 'alpha-user, beta-user ,gamma-user';

    expect(isAdminUser('alpha-user')).toBe(true);
    expect(isAdminUser('beta-user')).toBe(true);
    expect(isAdminUser('gamma-user')).toBe(true);
    expect(isAdminUser('delta-user')).toBe(false);
  });

  it('returns false for missing or nullish user IDs', () => {
    process.env.ADMIN_USER_IDS = 'ops-user';

    expect(isAdminUser(undefined)).toBe(false);
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser('')).toBe(false);
  });

  it('returns false when ADMIN_USER_IDS is undefined', () => {
    delete process.env.ADMIN_USER_IDS;

    expect(isAdminUser('ops-user')).toBe(false);
  });
});
