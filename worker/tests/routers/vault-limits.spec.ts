import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMiddleware } from 'hono/factory';

// Stands in for what authenticated() resolves off the caller's claims.
// undefined mirrors an API key caller, whose plan is unresolvable.
let planLimits: { cloudVaults: number } | undefined;

vi.mock('../../src/lib/middleware', () => ({
  authenticated: () =>
    createMiddleware(async (c, next) => {
      c.set('userId', 'user_123');
      if (planLimits) c.set('planLimits', planLimits);
      await next();
    }),
  apiKey: () => createMiddleware(async (_c, next) => next()),
  service: () => createMiddleware(async (_c, next) => next()),
}));

const createVault = vi.fn();
const createVaultToken = vi.fn();
const listVaults = vi.fn();

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
    createVaultUtils: () => ({
      createVault,
      createVaultToken,
      listVaults,
    }),
  };
});

const testEnv = { TURSO_PLATFORM_API_TOKEN: 'test-token' };

const create = async () => {
  const vaultRouter = (await import('../../src/routers/vault'))
    .default;

  return vaultRouter.request(
    '/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'demo' }),
    },
    testEnv,
  );
};

const vault = (Name: string) => ({ Name, Hostname: `${Name}.turso.io` });

describe('POST /vault cloud vault cap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    planLimits = undefined;
    createVault.mockResolvedValue({
      DbId: 'db_1',
      Hostname: 'hash13-demo.turso.io',
    });
    createVaultToken.mockResolvedValue('full-access-jwt');
  });

  it('refuses to create past the plan cap', async () => {
    planLimits = { cloudVaults: 1 };
    listVaults.mockResolvedValue([vault('hash13-existing')]);

    const res = await create();

    expect(res.status).toBe(403);
    expect(createVault).not.toHaveBeenCalled();
  });

  it('creates while under the plan cap', async () => {
    planLimits = { cloudVaults: 3 };
    listVaults.mockResolvedValue([vault('hash13-existing')]);

    const res = await create();

    expect(res.status).toBe(201);
    expect(createVault).toHaveBeenCalled();
  });

  // A free user has a cap of zero, so the very first create is refused
  // without ever reaching Turso.
  it('refuses the first vault when the cap is zero', async () => {
    planLimits = { cloudVaults: 0 };
    listVaults.mockResolvedValue([]);

    const res = await create();

    expect(res.status).toBe(403);
    expect(createVault).not.toHaveBeenCalled();
  });

  // An API key carries no session claims, so the plan is unknown. That must
  // read as "cannot enforce" rather than defaulting to the free cap of zero,
  // which would break every CI caller.
  it('skips the cap when the plan is unresolvable', async () => {
    planLimits = undefined;

    const res = await create();

    expect(res.status).toBe(201);
    expect(listVaults).not.toHaveBeenCalled();
  });

  it('skips the count entirely when the plan is unlimited', async () => {
    planLimits = { cloudVaults: Infinity };

    const res = await create();

    expect(res.status).toBe(201);
    expect(listVaults).not.toHaveBeenCalled();
  });
});
