import { describe, expect, it } from 'vitest';
import { TURSO_ORGANIZATION } from '../../lib/constants';
import {
  userOwnsVault,
  vaultNameFromUserId,
  vaultSyncUrl,
} from '../../lib/turso/utils';

describe('vaultSyncUrl', () => {
  it('derives the hostname from the remote name and org', () => {
    expect(vaultSyncUrl('a1b2c3d4e5f67-work')).toBe(
      `libsql://a1b2c3d4e5f67-work-${TURSO_ORGANIZATION}.turso.io`,
    );
  });

  it('accepts an explicit org override', () => {
    expect(vaultSyncUrl('a1b2c3d4e5f67', 'other-org')).toBe(
      'libsql://a1b2c3d4e5f67-other-org.turso.io',
    );
  });
});

describe('userOwnsVault', () => {
  const userId = 'user_2abcDEF';

  it('accepts a vault carrying the caller’s prefix', async () => {
    const name = await vaultNameFromUserId(userId, 'work');

    expect(await userOwnsVault(userId, name)).toBe(true);
  });

  it('rejects a vault owned by another user', async () => {
    const name = await vaultNameFromUserId('user_other', 'work');

    expect(await userOwnsVault(userId, name)).toBe(false);
  });

  it('rejects the bare prefix with no vault segment', async () => {
    const prefix = await vaultNameFromUserId(userId);

    expect(await userOwnsVault(userId, prefix)).toBe(false);
  });
});
