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

describe('setSession', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.DEADROP_INSTALL_METHOD;
  });

  const mockSetPasswordFailure = () => {
    const setPassword = vi.fn().mockImplementation(() => {
      throw new Error('access denied');
    });
    vi.spyOn(keyring, 'Entry').mockImplementation(
      () => ({ setPassword }) as any,
    );
  };

  it('points Linux users at libsecret', async () => {
    vi.stubGlobal('process', { ...process, platform: 'linux' });
    mockSetPasswordFailure();
    const { setSession } = await import('lib/auth/cache');

    await expect(setSession('token')).rejects.toThrow(/libsecret/);
  });

  it('points macOS/Windows users at their keychain prompt, not libsecret', async () => {
    vi.stubGlobal('process', { ...process, platform: 'darwin' });
    mockSetPasswordFailure();
    const { setSession } = await import('lib/auth/cache');

    await expect(setSession('token')).rejects.toThrow(
      /keychain access/,
    );
    await expect(setSession('token')).rejects.not.toThrow(/libsecret/);
  });

  it('writes the token when the backend succeeds', async () => {
    const setPassword = vi.fn();
    vi.spyOn(keyring, 'Entry').mockImplementation(
      () => ({ setPassword }) as any,
    );
    const { setSession } = await import('lib/auth/cache');

    await setSession('a-token');

    expect(setPassword).toHaveBeenCalledWith('a-token');
  });
});
