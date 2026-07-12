import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lib/log', () => ({
  logInfo: vi.fn(),
}));

// cache.ts loads @napi-rs/keyring via an inline require() (required for
// bundler DCE), which bypasses vi.mock's static import interception. Patch
// the real, Node-cached module object instead so cache.ts's own require()
// picks up the same mocked Entry.
const keyring = require('@napi-rs/keyring');

describe('getToken', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DEADROP_INSTALL_METHOD;
  });

  it('returns an empty string with no warning when no credential is stored', async () => {
    const getPassword = vi.fn().mockImplementation(() => {
      throw new Error('No matching entry found in secure storage');
    });
    vi.spyOn(keyring, 'Entry').mockImplementation(
      () => ({ getPassword }) as any,
    );
    const { getToken } = await import('lib/auth/cache');
    const { logInfo } = await import('lib/log');

    expect(await getToken()).toEqual('');
    expect(logInfo).not.toHaveBeenCalled();
  });

  it('returns an empty string and warns once across repeated calls on a backend failure', async () => {
    const getPassword = vi.fn().mockImplementation(() => {
      throw new Error('keychain daemon unreachable');
    });
    vi.spyOn(keyring, 'Entry').mockImplementation(
      () => ({ getPassword }) as any,
    );
    const { getToken } = await import('lib/auth/cache');
    const { logInfo } = await import('lib/log');

    expect(await getToken()).toEqual('');
    expect(await getToken()).toEqual('');
    expect(logInfo).toHaveBeenCalledTimes(1);
  });

  it('returns the stored token', async () => {
    const getPassword = vi.fn().mockReturnValue('a-token');
    vi.spyOn(keyring, 'Entry').mockImplementation(
      () => ({ getPassword }) as any,
    );
    const { getToken } = await import('lib/auth/cache');

    expect(await getToken()).toEqual('a-token');
  });
});
