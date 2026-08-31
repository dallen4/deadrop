import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lib/auth/clerk', () => ({
  getSessionToken: vi.fn(),
}));

vi.mock('@shared/client', () => ({
  createClient: vi.fn(),
}));

describe('mintVaultToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEADROP_API_URL = 'https://api.test';
  });

  it('throws when signed out', async () => {
    const { getSessionToken } = await import('lib/auth/clerk');
    const { mintVaultToken } = await import('lib/auth/vault-token');

    vi.mocked(getSessionToken).mockResolvedValue(null);

    await expect(mintVaultToken('default')).rejects.toThrow(
      'No session token found!',
    );
  });

  it('returns the resolved remote name with the token', async () => {
    const { getSessionToken } = await import('lib/auth/clerk');
    const { createClient } = await import('@shared/client');
    const { mintVaultToken } = await import('lib/auth/vault-token');

    vi.mocked(getSessionToken).mockResolvedValue('session-token');

    const $post = vi.fn().mockResolvedValue({
      status: 201,
      json: async () => ({
        token: 'minted-token',
        name: 'a1b2c3d4e5f67-my-vault',
      }),
    });
    vi.mocked(createClient).mockReturnValue({
      vault: { tokens: { $post } },
    } as any);

    const result = await mintVaultToken('my-vault');

    // The local label goes out; the prefixed remote name comes back.
    expect($post).toHaveBeenCalledWith({
      json: { name: 'my-vault' },
    });
    expect(result).toEqual({
      token: 'minted-token',
      name: 'a1b2c3d4e5f67-my-vault',
    });
  });

  it('throws VaultNotFoundError on a 404', async () => {
    const { getSessionToken } = await import('lib/auth/clerk');
    const { createClient } = await import('@shared/client');
    const { mintVaultToken, VaultNotFoundError } =
      await import('lib/auth/vault-token');

    vi.mocked(getSessionToken).mockResolvedValue('session-token');

    const $post = vi.fn().mockResolvedValue({
      status: 404,
      json: async () => ({ error: "Vault 'missing' not found." }),
    });
    vi.mocked(createClient).mockReturnValue({
      vault: { tokens: { $post } },
    } as any);

    await expect(mintVaultToken('missing')).rejects.toThrow(
      VaultNotFoundError,
    );
  });

  it('throws when the body drifts from the shared schema', async () => {
    const { getSessionToken } = await import('lib/auth/clerk');
    const { createClient } = await import('@shared/client');
    const { mintVaultToken } = await import('lib/auth/vault-token');

    vi.mocked(getSessionToken).mockResolvedValue('session-token');

    // The exact regression: the worker used to answer `authToken`, which
    // the CLI read as `token` — undefined, so the sync went out unsigned.
    const $post = vi.fn().mockResolvedValue({
      status: 201,
      json: async () => ({
        authToken: 'minted-token',
        name: 'a1b2c3d4e5f67-my-vault',
      }),
    });
    vi.mocked(createClient).mockReturnValue({
      vault: { tokens: { $post } },
    } as any);

    await expect(mintVaultToken('my-vault')).rejects.toThrow(
      'Malformed vault token response!',
    );
  });

  it('throws on an unexpected non-201 response', async () => {
    const { getSessionToken } = await import('lib/auth/clerk');
    const { createClient } = await import('@shared/client');
    const { mintVaultToken } = await import('lib/auth/vault-token');

    vi.mocked(getSessionToken).mockResolvedValue('session-token');

    const $post = vi.fn().mockResolvedValue({ status: 500 });
    vi.mocked(createClient).mockReturnValue({
      vault: { tokens: { $post } },
    } as any);

    await expect(mintVaultToken('default')).rejects.toThrow(
      'Failed to mint vault token!',
    );
  });
});

describe('mintVaultTokenWithApiKey', () => {
  const ciResponse = (status: number, body: unknown) => {
    const $post = vi
      .fn()
      .mockResolvedValue({ status, json: async () => body });

    return { $post };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEADROP_API_URL = 'https://api.test';
    delete process.env.DEADROP_API_KEY;
  });

  it('throws when no API key is available', async () => {
    const { mintVaultTokenWithApiKey } =
      await import('lib/auth/vault-token');

    await expect(mintVaultTokenWithApiKey()).rejects.toThrow(
      'No API key provided!',
    );
  });

  it('returns the vault, token and the environment from the key claims', async () => {
    const { createClient } = await import('@shared/client');
    const { mintVaultTokenWithApiKey } =
      await import('lib/auth/vault-token');

    const { $post } = ciResponse(201, {
      token: 'ci-token',
      name: 'a1b2c3d4e5f67-my-app',
      environment: 'production',
    });
    vi.mocked(createClient).mockReturnValue({
      vault: { tokens: { ci: { $post } } },
    } as any);

    const result = await mintVaultTokenWithApiKey('sk_test');

    // The key identifies the vault, so nothing is sent in the body.
    expect($post).toHaveBeenCalledWith();
    expect(result).toEqual({
      token: 'ci-token',
      name: 'a1b2c3d4e5f67-my-app',
      environment: 'production',
    });
  });

  it('falls back to DEADROP_API_KEY', async () => {
    const { createClient } = await import('@shared/client');
    const { mintVaultTokenWithApiKey } =
      await import('lib/auth/vault-token');

    process.env.DEADROP_API_KEY = 'sk_env';

    const { $post } = ciResponse(201, {
      token: 'ci-token',
      name: 'a1b2c3d4e5f67-my-app',
      environment: 'production',
    });
    vi.mocked(createClient).mockReturnValue({
      vault: { tokens: { ci: { $post } } },
    } as any);

    await mintVaultTokenWithApiKey();

    expect(createClient).toHaveBeenCalledWith('https://api.test', {
      headers: { Authorization: 'Bearer sk_env' },
    });
  });

  it('throws VaultNotFoundError on a 404', async () => {
    const { createClient } = await import('@shared/client');
    const { mintVaultTokenWithApiKey, VaultNotFoundError } =
      await import('lib/auth/vault-token');

    const { $post } = ciResponse(404, {
      error: "Vault 'gone' not found.",
    });
    vi.mocked(createClient).mockReturnValue({
      vault: { tokens: { ci: { $post } } },
    } as any);

    await expect(mintVaultTokenWithApiKey('sk_test')).rejects.toThrow(
      VaultNotFoundError,
    );
  });

  it('throws rather than parsing an error body as credentials', async () => {
    const { createClient } = await import('@shared/client');
    const { mintVaultTokenWithApiKey } =
      await import('lib/auth/vault-token');

    // A 401 body has no token or environment; parsing it would inject
    // zero secrets and still exit 0.
    const { $post } = ciResponse(401, {
      message: 'Provided key has invalid scope(s) and/or claims!',
    });
    vi.mocked(createClient).mockReturnValue({
      vault: { tokens: { ci: { $post } } },
    } as any);

    await expect(mintVaultTokenWithApiKey('sk_test')).rejects.toThrow(
      'Failed to mint vault token!',
    );
  });
});
