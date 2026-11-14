import { describe, expect, it, vi } from 'vitest';
import { createProvisionHandlers } from '../../lib/turso/provision';
import { VaultTokenAccess } from '../../lib/constants';
import { TursoApiError } from '../../lib/turso/client';

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

    await handlers.createVaultToken(
      'my-vault',
      VaultTokenAccess.ReadOnly,
    );

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
      await handlers.createVaultToken(
        'my-vault',
        VaultTokenAccess.ReadOnly,
      ),
    ).toBe('a-jwt');
  });
});

describe('path encoding', () => {
  it('encodes the database name as one path segment', async () => {
    const { post, handlers } = stubClient();

    await handlers.createVaultToken(
      'a/../b',
      VaultTokenAccess.ReadOnly,
    );

    expect(post).toHaveBeenCalledWith(
      '/a%2F..%2Fb/auth/tokens?authorization=read-only',
    );
  });

  it('keeps the expiration from injecting query params', async () => {
    const { post, handlers } = stubClient();

    await handlers.createVaultToken(
      'my-vault',
      VaultTokenAccess.ReadOnly,
      '5m&authorization=full-access',
    );

    expect(post).toHaveBeenCalledWith(
      '/my-vault/auth/tokens?authorization=read-only&expiration=5m%26authorization%3Dfull-access',
    );
  });
});

describe('createVault', () => {
  const database = { Name: 'abc-default', DbId: 'id', Hostname: 'h' };

  const stubCreate = (patchError: Error) => {
    const del = vi
      .fn()
      .mockResolvedValue({ database: database.Name });
    const handlers = createProvisionHandlers({
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ database }),
      patch: vi.fn().mockRejectedValue(patchError),
      del,
    } as any);

    return { del, handlers };
  };

  it('keeps the vault when Turso refuses size_limit', async () => {
    const { del, handlers } = stubCreate(
      new TursoApiError(
        400,
        'PATCH',
        '/abc-default/configuration',
        '{"error":"size_limit is not supported for db-api controlled databases"}',
      ),
    );

    await expect(handlers.createVault('abc-default')).resolves.toBe(
      database,
    );
    expect(del).not.toHaveBeenCalled();
  });

  it('rolls back the vault on any other configuration error', async () => {
    const error = new TursoApiError(
      500,
      'PATCH',
      '/abc-default/configuration',
      'boom',
    );
    const { del, handlers } = stubCreate(error);

    await expect(handlers.createVault('abc-default')).rejects.toBe(
      error,
    );
    expect(del).toHaveBeenCalledWith('/abc-default');
  });
});
