import { beforeEach, describe, expect, it, vi } from 'vitest';

const ensureSecretsSchema = vi.fn();
const syncWithRetry = vi.fn();

const initDBConfig = vi.fn((path: string) => [
  { url: `file:${path}` },
  {},
]);

vi.mock('@shared/db/init', () => ({
  initDBConfig: (...args: unknown[]) =>
    (initDBConfig as any)(...args),
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

  // Replicating is itself a write, so a read-only token needs a path that
  // never touches the local replica at all.
  it('skips replication entirely with sync off', async () => {
    const { initDBClient } = await import('db/init');

    await initDBClient(
      '/tmp/replica.db',
      { name: 'a1b2c3d4e5f67-my-app', authToken: 'read-only-jwt' },
      false,
    );

    expect(syncWithRetry).not.toHaveBeenCalled();
    expect(ensureSecretsSchema).not.toHaveBeenCalled();
    expect(initDBConfig).toHaveBeenCalledWith(
      '/tmp/replica.db',
      expect.anything(),
      false,
    );
  });
});

describe('initDBConfig', () => {
  it('points straight at Turso when sync is off', async () => {
    const actual =
      await vi.importActual<typeof import('@shared/db/init')>(
        '@shared/db/init',
      );

    const [config] = actual.initDBConfig(
      '/tmp/replica.db',
      { name: 'a1b2c3d4e5f67-my-app', authToken: 'read-only-jwt' },
      false,
    );

    expect(config.url).toContain('a1b2c3d4e5f67-my-app');
    expect(config.authToken).toBe('read-only-jwt');
    // No local file, so nothing to replicate into.
    expect(config.syncUrl).toBeUndefined();
  });

  it('builds a replica with sync on', async () => {
    const actual =
      await vi.importActual<typeof import('@shared/db/init')>(
        '@shared/db/init',
      );

    const [config] = actual.initDBConfig('/tmp/replica.db', {
      name: 'a1b2c3d4e5f67-my-app',
      authToken: 'jwt',
    });

    expect(config.url).toBe('file:/tmp/replica.db');
    expect(config.syncUrl).toContain('a1b2c3d4e5f67-my-app');
  });
});
