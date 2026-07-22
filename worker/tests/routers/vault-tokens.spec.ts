import { describe, expect, it, vi } from 'vitest';
import { createMiddleware } from 'hono/factory';
import { TursoApiError } from '@shared/lib/turso';

vi.mock('../../src/lib/middleware', () => ({
  authenticated: () => createMiddleware(async (_c, next) => next()),
  restricted: () =>
    createMiddleware(async (c, next) => {
      c.set('userId', 'user_123');
      await next();
    }),
  service: () => createMiddleware(async (_c, next) => next()),
}));

const getVault = vi.fn();
const createVaultToken = vi.fn();

vi.mock('@shared/lib/turso', async () => {
  const actual = await vi.importActual<typeof import('@shared/lib/turso')>(
    '@shared/lib/turso',
  );
  return {
    ...actual,
    vaultNameFromUserId: vi.fn(async (userId: string, name?: string) =>
      name ? `hash13-${name}` : 'hash13',
    ),
    createVaultUtils: () => ({ getVault, createVaultToken }),
  };
});

const testEnv = {
  TURSO_ORGANIZATION: 'test-org',
  TURSO_PLATFORM_API_TOKEN: 'test-token',
};

describe('POST /vault/tokens', () => {
  it('mints a read-only token and returns the hostname', async () => {
    vi.clearAllMocks();
    getVault.mockResolvedValue({ Hostname: 'my-vault.turso.io' });
    createVaultToken.mockResolvedValue('read-only-jwt');

    const vaultRouter = (await import('../../src/routers/vault')).default;
    const res = await vaultRouter.request(
      '/tokens',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      testEnv,
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      token: 'read-only-jwt',
      hostname: 'my-vault.turso.io',
    });
    expect(createVaultToken).toHaveBeenCalledWith('hash13', 'read-only');
  });

  it('resolves a named vault via vaultNameFromUserId(userId, name)', async () => {
    vi.clearAllMocks();
    getVault.mockResolvedValue({ Hostname: 'named-vault.turso.io' });
    createVaultToken.mockResolvedValue('read-only-jwt');

    const vaultRouter = (await import('../../src/routers/vault')).default;
    const res = await vaultRouter.request(
      '/tokens',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'demo' }),
      },
      testEnv,
    );

    expect(res.status).toBe(201);
    expect(createVaultToken).toHaveBeenCalledWith(
      'hash13-demo',
      'read-only',
    );
  });

  it('returns a clean 404 when the vault does not exist', async () => {
    vi.clearAllMocks();
    getVault.mockRejectedValue(
      new TursoApiError(404, 'GET', '/missing', 'not found'),
    );
    createVaultToken.mockRejectedValue(
      new TursoApiError(404, 'POST', '/missing/auth/tokens', 'not found'),
    );

    const vaultRouter = (await import('../../src/routers/vault')).default;
    const res = await vaultRouter.request(
      '/tokens',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'missing' }),
      },
      testEnv,
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "Vault 'missing' not found.",
    });
  });

  it('returns 500 for any other error', async () => {
    vi.clearAllMocks();
    getVault.mockRejectedValue(new Error('boom'));
    createVaultToken.mockResolvedValue('read-only-jwt');

    const vaultRouter = (await import('../../src/routers/vault')).default;
    const res = await vaultRouter.request(
      '/tokens',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      testEnv,
    );

    expect(res.status).toBe(500);
  });
});
