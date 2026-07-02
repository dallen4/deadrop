import { describe, expect, it, vi } from 'vitest';
import { createCacheHandlers } from '../../src/lib/cache';

const createMockRedis = () => {
  const store = new Map<string, number>();

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    setex: vi.fn(
      async (key: string, _ttl: number, val: number) => {
        store.set(key, val);
      },
    ),
    incr: vi.fn(async (key: string) => {
      const next = (store.get(key) ?? 0) + 1;
      store.set(key, next);
      return next;
    }),
    hset: vi.fn(async () => {}),
    hgetall: vi.fn(async () => null),
    expire: vi.fn(async () => {}),
    del: vi.fn(async () => {}),
    set: vi.fn(async () => {}),
    store,
  };
};

const createMockContext = (
  redis: ReturnType<typeof createMockRedis>,
  dailyDropLimit = 5,
) =>
  ({
    get: (key: string) => {
      if (key === 'redis') return redis;
      return undefined;
    },
    env: { DAILY_DROP_LIMIT: dailyDropLimit },
  }) as any;

describe('checkAndIncrementUserDropCount', () => {
  it('allows the first drop from an IP', async () => {
    const redis = createMockRedis();
    const ctx = createMockContext(redis);
    const { checkAndIncrementUserDropCount } =
      createCacheHandlers(ctx);

    const allowed = await checkAndIncrementUserDropCount(
      '192.168.1.1',
    );

    expect(allowed).toBe(true);
    expect(redis.setex).toHaveBeenCalledOnce();
  });

  it('allows drops up to the daily limit', async () => {
    const redis = createMockRedis();
    const ctx = createMockContext(redis, 5);
    const { checkAndIncrementUserDropCount } =
      createCacheHandlers(ctx);

    for (let i = 0; i < 5; i++) {
      const allowed =
        await checkAndIncrementUserDropCount('10.0.0.1');
      expect(allowed).toBe(true);
    }
  });

  it('rejects drops beyond the daily limit', async () => {
    const redis = createMockRedis();
    const ctx = createMockContext(redis, 5);
    const { checkAndIncrementUserDropCount } =
      createCacheHandlers(ctx);

    for (let i = 0; i < 5; i++) {
      await checkAndIncrementUserDropCount('10.0.0.1');
    }

    const rejected =
      await checkAndIncrementUserDropCount('10.0.0.1');
    expect(rejected).toBe(false);
  });

  it('tracks IPs independently', async () => {
    const redis = createMockRedis();
    const ctx = createMockContext(redis, 1);
    const { checkAndIncrementUserDropCount } =
      createCacheHandlers(ctx);

    const first =
      await checkAndIncrementUserDropCount('10.0.0.1');
    expect(first).toBe(true);

    const firstRejected =
      await checkAndIncrementUserDropCount('10.0.0.1');
    expect(firstRejected).toBe(false);

    const secondIp =
      await checkAndIncrementUserDropCount('10.0.0.2');
    expect(secondIp).toBe(true);
  });
});

describe('checkAndIncrementAuthUserDropCount', () => {
  it('allows drops within the plan limit', async () => {
    const redis = createMockRedis();
    const ctx = createMockContext(redis);
    const { checkAndIncrementAuthUserDropCount } =
      createCacheHandlers(ctx);

    for (let i = 0; i < 5; i++) {
      const allowed =
        await checkAndIncrementAuthUserDropCount(
          'user_abc',
          5,
        );
      expect(allowed).toBe(true);
    }
  });

  it('rejects drops beyond the plan limit', async () => {
    const redis = createMockRedis();
    const ctx = createMockContext(redis);
    const { checkAndIncrementAuthUserDropCount } =
      createCacheHandlers(ctx);

    for (let i = 0; i < 5; i++) {
      await checkAndIncrementAuthUserDropCount('user_abc', 5);
    }

    const rejected =
      await checkAndIncrementAuthUserDropCount('user_abc', 5);
    expect(rejected).toBe(false);
  });

  it('never rejects when limit is Infinity', async () => {
    const redis = createMockRedis();
    const ctx = createMockContext(redis);
    const { checkAndIncrementAuthUserDropCount } =
      createCacheHandlers(ctx);

    for (let i = 0; i < 100; i++) {
      const allowed =
        await checkAndIncrementAuthUserDropCount(
          'user_pro',
          Infinity,
        );
      expect(allowed).toBe(true);
    }
  });
});
