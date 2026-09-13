import { describe, expect, it, vi } from 'vitest';
import { createCacheHandlers } from '../../src/lib/cache';

// Stores strings and only parses on a 'json' read, like the real binding —
// a missing 'json' would otherwise pass here and concatenate in production.
const createMockKv = () => {
  const store = new Map<string, string>();

  return {
    get: vi.fn(async (key: string, type?: string) => {
      const raw = store.get(key) ?? null;

      if (raw === null) return null;

      return type === 'json' ? JSON.parse(raw) : raw;
    }),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    store,
  };
};

const createMockContext = (kv: ReturnType<typeof createMockKv>) =>
  ({ env: { DROP_STORE: kv } }) as any;

describe('checkAndIncrementUserDropCount', () => {
  it('allows the first drop from an IP', async () => {
    const kv = createMockKv();
    const ctx = createMockContext(kv);
    const { checkAndIncrementUserDropCount } =
      createCacheHandlers(ctx);

    const allowed = await checkAndIncrementUserDropCount(
      '192.168.1.1',
      5,
    );

    expect(allowed).toBe(true);
    expect(kv.put).toHaveBeenCalledOnce();
  });

  it('allows drops up to the daily limit', async () => {
    const kv = createMockKv();
    const ctx = createMockContext(kv);
    const { checkAndIncrementUserDropCount } =
      createCacheHandlers(ctx);

    for (let i = 0; i < 5; i++) {
      const allowed = await checkAndIncrementUserDropCount(
        '10.0.0.1',
        5,
      );
      expect(allowed).toBe(true);
    }
  });

  it('rejects drops beyond the daily limit', async () => {
    const kv = createMockKv();
    const ctx = createMockContext(kv);
    const { checkAndIncrementUserDropCount } =
      createCacheHandlers(ctx);

    for (let i = 0; i < 5; i++) {
      await checkAndIncrementUserDropCount('10.0.0.1', 5);
    }

    const rejected = await checkAndIncrementUserDropCount(
      '10.0.0.1',
      5,
    );
    expect(rejected).toBe(false);
  });

  it('tracks IPs independently', async () => {
    const kv = createMockKv();
    const ctx = createMockContext(kv);
    const { checkAndIncrementUserDropCount } =
      createCacheHandlers(ctx);

    const first = await checkAndIncrementUserDropCount('10.0.0.1', 1);
    expect(first).toBe(true);

    const firstRejected = await checkAndIncrementUserDropCount(
      '10.0.0.1',
      1,
    );
    expect(firstRejected).toBe(false);

    const secondIp = await checkAndIncrementUserDropCount(
      '10.0.0.2',
      1,
    );
    expect(secondIp).toBe(true);
  });
});

describe('checkAndIncrementAuthUserDropCount', () => {
  it('allows drops within the plan limit', async () => {
    const kv = createMockKv();
    const ctx = createMockContext(kv);
    const { checkAndIncrementAuthUserDropCount } =
      createCacheHandlers(ctx);

    for (let i = 0; i < 5; i++) {
      const allowed = await checkAndIncrementAuthUserDropCount(
        'user_abc',
        5,
      );
      expect(allowed).toBe(true);
    }
  });

  it('rejects drops beyond the plan limit', async () => {
    const kv = createMockKv();
    const ctx = createMockContext(kv);
    const { checkAndIncrementAuthUserDropCount } =
      createCacheHandlers(ctx);

    for (let i = 0; i < 5; i++) {
      await checkAndIncrementAuthUserDropCount('user_abc', 5);
    }

    const rejected = await checkAndIncrementAuthUserDropCount(
      'user_abc',
      5,
    );
    expect(rejected).toBe(false);
  });

  it('never rejects when limit is Infinity', async () => {
    const kv = createMockKv();
    const ctx = createMockContext(kv);
    const { checkAndIncrementAuthUserDropCount } =
      createCacheHandlers(ctx);

    for (let i = 0; i < 100; i++) {
      const allowed = await checkAndIncrementAuthUserDropCount(
        'user_pro',
        Infinity,
      );
      expect(allowed).toBe(true);
    }
  });
});
