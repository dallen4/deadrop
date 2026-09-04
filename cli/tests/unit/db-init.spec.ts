import { beforeEach, describe, expect, it, vi } from 'vitest';

const ensureSecretsSchema = vi.fn();
const syncWithRetry = vi.fn();

vi.mock('@shared/db/init', () => ({
  initDBConfig: (path: string) => [{ url: `file:${path}` }, {}],
  ensureSecretsSchema,
  syncWithRetry,
}));

vi.mock('@libsql/client', () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock('drizzle-orm/libsql/node', () => ({
  drizzle: vi.fn(() => ({ $client: {} })),
}));

describe('initDBClient', () => {
  beforeEach(() => vi.clearAllMocks());

  // CREATE TABLE is a write, which a read-only token forbids — it broke CI
  // and would break any grabbed shared vault the same way.
  it('does not write a schema to a cloud vault', async () => {
    const { initDBClient } = await import('db/init');

    await initDBClient('/tmp/replica.db', {
      name: 'a1b2c3d4e5f67-my-app',
      authToken: 'read-only-jwt',
    });

    expect(syncWithRetry).toHaveBeenCalled();
    expect(ensureSecretsSchema).not.toHaveBeenCalled();
  });

  it('bootstraps the schema for a local vault, which cannot sync', async () => {
    const { initDBClient } = await import('db/init');

    await initDBClient('/tmp/local.db');

    expect(ensureSecretsSchema).toHaveBeenCalled();
    expect(syncWithRetry).not.toHaveBeenCalled();
  });
});
