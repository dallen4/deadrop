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
const invalidateTokens = vi.fn();

vi.mock('@shared/lib/turso', async () => {
  const actual = await vi.importActual<typeof import('@shared/lib/turso')>(
    '@shared/lib/turso',
  );
  return {
    ...actual,
    vaultNameFromUserId: vi.fn(async (userId: string, name?: string) =>
      name ? `hash13-${name}` : 'hash13',
    ),
    createVaultUtils: () => ({
      getVault,
      createVaultToken,
      invalidateTokens,
    }),
  };
});

const testEnv = { TURSO_PLATFORM_API_TOKEN: 'test-token' };

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
      name: 'hash13',
      hostname: 'my-vault.turso.io',
    });
    expect(createVaultToken).toHaveBeenCalledWith(
      'hash13',
      'read-only',
      undefined,
    );
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
      undefined,
    );
  });

  // Guards the CLI `inject` path: it posts no `access` at all, so the
  // schema default is the only thing keeping its tokens read-only.
  it('defaults access to read-only when omitted', async () => {
    vi.clearAllMocks();
    getVault.mockResolvedValue({ Hostname: 'my-vault.turso.io' });
    createVaultToken.mockResolvedValue('read-only-jwt');

    const vaultRouter = (await import('../../src/routers/vault')).default;
    await vaultRouter.request(
      '/tokens',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'demo' }),
      },
      testEnv,
    );

    expect(createVaultToken).toHaveBeenCalledWith(
      'hash13-demo',
      'read-only',
      undefined,
    );
  });

  it('honors an explicit access level and expiration', async () => {
    vi.clearAllMocks();
    getVault.mockResolvedValue({ Hostname: 'my-vault.turso.io' });
    createVaultToken.mockResolvedValue('full-access-jwt');

    const vaultRouter = (await import('../../src/routers/vault')).default;
    const res = await vaultRouter.request(
      '/tokens',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'demo',
          access: 'full-access',
          expiration: '30d',
        }),
      },
      testEnv,
    );

    expect(res.status).toBe(201);
    expect(createVaultToken).toHaveBeenCalledWith(
      'hash13-demo',
      'full-access',
      '30d',
    );
  });

  it('rejects an unknown access level', async () => {
    vi.clearAllMocks();

    const vaultRouter = (await import('../../src/routers/vault')).default;
    const res = await vaultRouter.request(
      '/tokens',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access: 'admin' }),
      },
      testEnv,
    );

    expect(res.status).toBe(400);
    expect(createVaultToken).not.toHaveBeenCalled();
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

describe('POST /vault/rotate', () => {
  it('invalidates every token for the caller’s own vault', async () => {
    vi.clearAllMocks();
    invalidateTokens.mockResolvedValue(undefined);

    const vaultRouter = (await import('../../src/routers/vault')).default;
    const res = await vaultRouter.request(
      '/rotate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'demo' }),
      },
      testEnv,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      rotated: true,
      name: 'hash13-demo',
    });
    // Name is derived from the caller's userId, never the body alone.
    expect(invalidateTokens).toHaveBeenCalledWith('hash13-demo');
  });

  // The default vault's remote name is the bare `<hash13>`, so a required
  // path param would leave it unrotatable.
  it('rotates the default vault when no name is given', async () => {
    vi.clearAllMocks();
    invalidateTokens.mockResolvedValue(undefined);

    const vaultRouter = (await import('../../src/routers/vault')).default;
    const res = await vaultRouter.request(
      '/rotate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      testEnv,
    );

    expect(res.status).toBe(200);
    expect(invalidateTokens).toHaveBeenCalledWith('hash13');
  });

  it('returns a clean 404 when the vault does not exist', async () => {
    vi.clearAllMocks();
    invalidateTokens.mockRejectedValue(
      new TursoApiError(404, 'POST', '/missing/auth/rotate', 'not found'),
    );

    const vaultRouter = (await import('../../src/routers/vault')).default;
    const res = await vaultRouter.request(
      '/rotate',
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
    invalidateTokens.mockRejectedValue(new Error('boom'));

    const vaultRouter = (await import('../../src/routers/vault')).default;
    const res = await vaultRouter.request(
      '/rotate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'demo' }),
      },
      testEnv,
    );

    expect(res.status).toBe(500);
  });
});
