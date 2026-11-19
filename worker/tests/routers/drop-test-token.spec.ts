import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_TOKEN_HEADER, testTokenKey } from '@shared/tests/http';
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

vi.mock('../../src/lib/http/turn', () => ({
  generateTurnCredentials: vi.fn().mockResolvedValue({
    username: 'turn_user',
    credential: 'turn_cred',
  }),
}));

vi.mock('@clerk/hono', () => ({ getAuth: () => null }));

const STORED_TOKEN = 'stored-test-token';

// The route must compare against the stored value, not just check it exists.
const kv = {
  get: async (key: string, type?: string) =>
    key === testTokenKey && type === 'text' ? STORED_TOKEN : null,
};

const drop = async (presentedToken?: string) => {
  const dropRouter = (await import('../../src/routers/drop')).default;

  const app = hono()
    .use(async (c, next) => {
      c.set('ipAddress', '203.0.113.7');
      await next();
    })
    .route('/', dropRouter);

  return app.request(
    '/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(presentedToken
          ? { [TEST_TOKEN_HEADER]: presentedToken }
          : {}),
      },
      // >1 grabbers is gated unless the caller is a valid test session.
      body: JSON.stringify({ id: 'peer_1', maxGrabbers: 5 }),
    },
    { DROP_STORE: kv },
  );
};

describe('POST /drop test-token bypass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createDrop.mockResolvedValue({ dropId: 'drop_1', nonce: 'n_1' });
    checkAndIncrementUserDropCount.mockResolvedValue(true);
    checkAndIncrementAuthUserDropCount.mockResolvedValue(true);
  });

  it('grants the multidrop bypass to a token matching the KV entry', async () => {
    const res = await drop(STORED_TOKEN);

    expect(res.status).toBe(200);
    expect(createDrop).toHaveBeenCalledWith('peer_1', 5, true);
    // A test session skips the quota counters entirely.
    expect(checkAndIncrementUserDropCount).not.toHaveBeenCalled();
  });

  it('refuses a token that does not match the KV entry', async () => {
    const res = await drop('not-the-stored-token');

    expect(res.status).toBe(403);
    expect(createDrop).not.toHaveBeenCalled();
  });

  it('refuses an anonymous caller with no token', async () => {
    const res = await drop();

    expect(res.status).toBe(403);
    expect(createDrop).not.toHaveBeenCalled();
  });
});
