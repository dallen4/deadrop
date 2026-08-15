import { describe, expect, it, vi } from 'vitest';
import { createProvisionHandlers } from '../../lib/turso/provision';
import { VaultTokenAccess } from '../../lib/constants';

const stubClient = () => {
  const post = vi.fn().mockResolvedValue({ jwt: 'a-jwt' });

  return {
    post,
    handlers: createProvisionHandlers({
      get: vi.fn(),
      post,
      patch: vi.fn(),
      del: vi.fn(),
    } as any),
  };
};

describe('createVaultToken', () => {
  it('sends only the authorization param when no expiration', async () => {
    const { post, handlers } = stubClient();

    await handlers.createVaultToken('my-vault', VaultTokenAccess.ReadOnly);

    expect(post).toHaveBeenCalledWith(
      '/my-vault/auth/tokens?authorization=read-only',
    );
  });

  it('appends the expiration when one is given', async () => {
    const { post, handlers } = stubClient();

    await handlers.createVaultToken(
      'my-vault',
      VaultTokenAccess.FullAccess,
      '30d',
    );

    expect(post).toHaveBeenCalledWith(
      '/my-vault/auth/tokens?authorization=full-access&expiration=30d',
    );
  });

  it('returns the minted jwt', async () => {
    const { handlers } = stubClient();

    expect(
      await handlers.createVaultToken('my-vault', VaultTokenAccess.ReadOnly),
    ).toBe('a-jwt');
  });
});
