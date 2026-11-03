import { describe, expect, it, vi } from 'vitest';
import { createMiddleware } from 'hono/factory';

vi.mock('../../src/lib/middleware', () => ({
  authenticated: () =>
    createMiddleware(async (c, next) => {
      c.set('userId', 'user_123');
      await next();
    }),
  apiKey: () => createMiddleware(async (_c, next) => next()),
  service: () => createMiddleware(async (_c, next) => next()),
}));

const createVaultToken = vi.fn();
const deleteVault = vi.fn();
const invalidateTokens = vi.fn();

vi.mock('@shared/lib/turso', async () => {
  const actual = await vi.importActual<
    typeof import('@shared/lib/turso')
  >('@shared/lib/turso');
  return {
    ...actual,
    createVaultUtils: () => ({
      createVaultToken,
      deleteVault,
      invalidateTokens,
    }),
  };
});

const testEnv = { TURSO_PLATFORM_API_TOKEN: 'test-token' };

const router = async () =>
  (await import('../../src/routers/vault')).default;

const postJson = async (path: string, body: unknown) =>
  (await router()).request(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    testEnv,
  );

describe('vault name validation', () => {
  it.each(['x/../16c5c842d269c-default', '../other', 'Work'])(
    'refuses to mint a token for %j',
    async (name) => {
      vi.clearAllMocks();

      const res = await postJson('/tokens', { name });

      expect(res.status).toBe(400);
      expect(createVaultToken).not.toHaveBeenCalled();
    },
  );

  it('refuses to rotate a traversal name', async () => {
    vi.clearAllMocks();

    const res = await postJson('/rotate', {
      name: 'x/../16c5c842d269c-default',
    });

    expect(res.status).toBe(400);
    expect(invalidateTokens).not.toHaveBeenCalled();
  });

  it('refuses to delete an encoded traversal name', async () => {
    vi.clearAllMocks();

    const res = await (
      await router()
    ).request(
      '/x%2F..%2F16c5c842d269c-default',
      { method: 'DELETE' },
      testEnv,
    );

    expect(res.status).toBe(400);
    expect(deleteVault).not.toHaveBeenCalled();
  });

  it('refuses an expiration that is not a duration', async () => {
    vi.clearAllMocks();

    const res = await postJson('/tokens', {
      name: 'work',
      expiration: '5m&authorization=full-access',
    });

    expect(res.status).toBe(400);
    expect(createVaultToken).not.toHaveBeenCalled();
  });
});
