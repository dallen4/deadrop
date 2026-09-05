import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PLAN_LIMITS } from '@shared/config/plans';
import { hono } from '../../src/lib/http/core';

const createDrop = vi.fn();
const checkAndIncrementUserDropCount = vi.fn();
const checkAndIncrementAuthUserDropCount = vi.fn();

vi.mock('../../src/lib/cache', () => ({
  createCacheHandlers: () => ({
    createDrop,
    checkAndIncrementUserDropCount,
    checkAndIncrementAuthUserDropCount,
  }),
}));

vi.mock('@clerk/hono', () => ({ getAuth: () => null }));

const drop = async (userId?: string) => {
  const dropRouter = (await import('../../src/routers/drop')).default;

  const app = hono()
    .use(async (c, next) => {
      c.set('ipAddress', '203.0.113.7');
      c.set('redis', { get: async () => null } as never);
      if (userId) c.set('userId', userId);
      await next();
    })
    .route('/', dropRouter);

  return app.request(
    '/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'peer_1' }),
    },
    {},
  );
};

describe('POST /drop daily limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createDrop.mockResolvedValue({ dropId: 'drop_1', nonce: 'n_1' });
    checkAndIncrementUserDropCount.mockResolvedValue(true);
    checkAndIncrementAuthUserDropCount.mockResolvedValue(true);
  });

  it('counts a signed-in dropper against their own account', async () => {
    const res = await drop('user_123');

    expect(res.status).toBe(200);
    expect(checkAndIncrementAuthUserDropCount).toHaveBeenCalledWith(
      'user_123',
      PLAN_LIMITS.free.dailyDrops,
    );
    // Two people behind one address must not share an allowance.
    expect(checkAndIncrementUserDropCount).not.toHaveBeenCalled();
  });

  it('falls back to the IP counter when anonymous', async () => {
    const res = await drop();

    expect(res.status).toBe(200);
    expect(checkAndIncrementUserDropCount).toHaveBeenCalledWith(
      '203.0.113.7',
    );
    expect(checkAndIncrementAuthUserDropCount).not.toHaveBeenCalled();
  });

  it('refuses the drop once a signed-in user is over the limit', async () => {
    checkAndIncrementAuthUserDropCount.mockResolvedValue(false);

    const res = await drop('user_123');

    expect(res.status).toBe(500);
    expect(createDrop).not.toHaveBeenCalled();
  });

  it('refuses the drop once an anonymous IP is over the limit', async () => {
    checkAndIncrementUserDropCount.mockResolvedValue(false);

    const res = await drop();

    expect(res.status).toBe(500);
    expect(createDrop).not.toHaveBeenCalled();
  });
});
