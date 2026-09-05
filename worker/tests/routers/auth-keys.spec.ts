import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMiddleware } from 'hono/factory';
import { AuthScopes } from '@shared/lib/constants';

const list = vi.fn();
const create = vi.fn();

vi.mock('../../src/lib/middleware', () => ({
  authenticated: () => createMiddleware(async (_c, next) => next()),
  restricted: () =>
    createMiddleware(async (c, next) => {
      c.set('userId', 'user_123');
      c.set('clerk', { apiKeys: { list, create } });
      await next();
    }),
  apiKey: () => createMiddleware(async (_c, next) => next()),
  service: () => createMiddleware(async (_c, next) => next()),
}));

vi.mock('@shared/lib/turso', async () => {
  const actual = await vi.importActual<
    typeof import('@shared/lib/turso')
  >('@shared/lib/turso');
  return {
    ...actual,
    vaultNameFromUserId: vi.fn(
      async (_userId: string, name?: string) =>
        name ? `hash13-${name}` : 'hash13',
    ),
  };
});

const testEnv = {};

const key = (over: Record<string, unknown> = {}) => ({
  id: 'key_1',
  name: 'hash13-demo production Key',
  expired: false,
  revoked: false,
  scopes: [AuthScopes.VaultInject],
  claims: { vaultName: 'hash13-demo', environment: 'production' },
  secret: 'sk_should_never_leak',
  ...over,
});

const listKeys = async (query: string) => {
  const authRouter = (await import('../../src/routers/auth')).default;

  return authRouter.request(`/keys?${query}`, {}, testEnv);
};

describe('GET /auth/keys', () => {
  beforeEach(() => vi.clearAllMocks());

  // The claims store the resolved cloud name, so a filter that compared
  // the caller's local name straight from the query matched nothing.
  it('matches claims against the resolved cloud vault name', async () => {
    list.mockResolvedValue({ data: [key()] });

    const res = await listKeys(
      'vaultName=demo&environment=production',
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      {
        id: 'key_1',
        name: 'hash13-demo production Key',
        expired: false,
        revoked: false,
      },
    ]);
    expect(list).toHaveBeenCalledWith({ subject: 'user_123' });
  });

  it('never returns the key secret', async () => {
    list.mockResolvedValue({ data: [key()] });

    const res = await listKeys(
      'vaultName=demo&environment=production',
    );

    expect(JSON.stringify(await res.json())).not.toContain(
      'sk_should_never_leak',
    );
  });

  it('drops keys claimed for another vault or environment', async () => {
    list.mockResolvedValue({
      data: [
        key({
          id: 'other_vault',
          claims: {
            vaultName: 'hash13-elsewhere',
            environment: 'production',
          },
        }),
        key({
          id: 'other_env',
          claims: {
            vaultName: 'hash13-demo',
            environment: 'staging',
          },
        }),
      ],
    });

    const res = await listKeys(
      'vaultName=demo&environment=production',
    );

    expect(await res.json()).toEqual([]);
  });

  it('drops keys without the requested scope', async () => {
    list.mockResolvedValue({
      data: [key({ id: 'wrong_scope', scopes: ['something:else'] })],
    });

    const res = await listKeys(
      `vaultName=demo&environment=production&scopes=${AuthScopes.VaultInject}`,
    );

    expect(await res.json()).toEqual([]);
  });

  it('drops keys carrying no scopes at all', async () => {
    list.mockResolvedValue({ data: [key({ scopes: [] })] });

    const res = await listKeys(
      'vaultName=demo&environment=production',
    );

    expect(await res.json()).toEqual([]);
  });

  it('rejects a request missing the vault target', async () => {
    const res = await listKeys('vaultName=demo');

    expect(res.status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });
});

describe('POST /auth/keys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('issues a scoped key against the resolved vault name', async () => {
    create.mockResolvedValue({
      id: 'key_1',
      name: 'issued',
      secret: 'sk_live_123',
    });

    const authRouter = (await import('../../src/routers/auth'))
      .default;
    const res = await authRouter.request(
      '/keys',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultName: 'demo',
          environment: 'production',
        }),
      },
      testEnv,
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      id: 'key_1',
      name: 'issued',
      key: 'sk_live_123',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'user_123',
        scopes: [AuthScopes.VaultInject],
        claims: {
          vaultName: 'hash13-demo',
          environment: 'production',
        },
      }),
    );
  });

  // Clerk returns the plaintext only on create, so a key we cannot hand
  // back is unusable and must not read as success.
  it('fails when Clerk returns no secret', async () => {
    create.mockResolvedValue({ id: 'key_1', name: 'issued' });

    const authRouter = (await import('../../src/routers/auth'))
      .default;
    const res = await authRouter.request(
      '/keys',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultName: 'demo',
          environment: 'production',
        }),
      },
      testEnv,
    );

    expect(res.status).toBe(500);
  });
});
