import 'server-only';

function readAdminUserIds(): Set<string> {
  const rawAdminUserIds = process.env.ADMIN_USER_IDS;

  if (!rawAdminUserIds) {
    return new Set<string>();
  }

  const normalizedIds = rawAdminUserIds
    .split(',')
    .map((adminUserId) => adminUserId.trim())
    .filter((adminUserId) => adminUserId.length > 0);

  return new Set<string>(normalizedIds);
}

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) {
    return false;
  }

  return readAdminUserIds().has(userId);
}
