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

  it('returns null when signed out', async () => {
    const { getSessionToken } = await import('lib/auth/clerk');
    const { mintVaultToken } = await import('lib/auth/vault-token');

    vi.mocked(getSessionToken).mockResolvedValue(null);

    const result = await mintVaultToken();

    expect(result).toBeNull();
  });

  it('mints a read-only token and builds a sync url', async () => {
    const { getSessionToken } = await import('lib/auth/clerk');
    const { createClient } = await import('@shared/client');
    const { mintVaultToken } = await import('lib/auth/vault-token');

    vi.mocked(getSessionToken).mockResolvedValue('session-token');

    const $post = vi.fn().mockResolvedValue({
      status: 201,
      json: async () => ({
        token: 'minted-token',
        hostname: 'my-vault.turso.io',
      }),
    });
    vi.mocked(createClient).mockReturnValue({
      vault: { tokens: { $post } },
    } as any);

    const result = await mintVaultToken('my-vault');

    expect($post).toHaveBeenCalledWith({ json: { name: 'my-vault' } });
    expect(result).toEqual({
      authToken: 'minted-token',
      syncUrl: 'libsql://my-vault.turso.io',
    });
  });

  it('sends an empty body when no vault name is given', async () => {
    const { getSessionToken } = await import('lib/auth/clerk');
    const { createClient } = await import('@shared/client');
    const { mintVaultToken } = await import('lib/auth/vault-token');

    vi.mocked(getSessionToken).mockResolvedValue('session-token');

    const $post = vi.fn().mockResolvedValue({
      status: 201,
      json: async () => ({
        token: 'minted-token',
        hostname: 'default.turso.io',
      }),
    });
    vi.mocked(createClient).mockReturnValue({
      vault: { tokens: { $post } },
    } as any);

    await mintVaultToken();

    expect($post).toHaveBeenCalledWith({ json: {} });
  });

  it('throws VaultNotFoundError on a 404', async () => {
    const { getSessionToken } = await import('lib/auth/clerk');
    const { createClient } = await import('@shared/client');
    const { mintVaultToken, VaultNotFoundError } = await import(
      'lib/auth/vault-token'
    );

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

  it('returns null on an unexpected non-201 response', async () => {
    const { getSessionToken } = await import('lib/auth/clerk');
    const { createClient } = await import('@shared/client');
    const { mintVaultToken } = await import('lib/auth/vault-token');

    vi.mocked(getSessionToken).mockResolvedValue('session-token');

    const $post = vi.fn().mockResolvedValue({ status: 500 });
    vi.mocked(createClient).mockReturnValue({
      vault: { tokens: { $post } },
    } as any);

    const result = await mintVaultToken();

    expect(result).toBeNull();
  });
});
