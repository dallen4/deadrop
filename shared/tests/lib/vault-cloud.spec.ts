import { describe, expect, it, vi } from 'vitest';
import { VaultTokenAccess } from '../../lib/constants';
import { connectCloudVault } from '../../lib/vault-cloud';

const res = (status: number, body: unknown) => ({
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const client = ({
  found,
  token = res(201, { token: 'fresh' }),
  created = res(201, { name: 'h-app', token: 'new' }),
}: {
  found: ReturnType<typeof res>;
  token?: ReturnType<typeof res>;
  created?: ReturnType<typeof res>;
}) => {
  const $get = vi.fn().mockResolvedValue(found);
  const tokens = vi.fn().mockResolvedValue(token);
  const $post = vi.fn().mockResolvedValue(created);
  return {
    api: {
      vault: {
        ':name': { $get },
        tokens: { $post: tokens },
        $post,
      },
    } as any,
    $get,
    tokens,
    $post,
  };
};

describe('connectCloudVault', () => {
  it('reattaches to an existing db with a full access token', async () => {
    const { api, tokens, $post } = client({
      found: res(200, { vault: { Name: 'h-app' } }),
    });

    await expect(connectCloudVault(api, 'app')).resolves.toEqual({
      name: 'h-app',
      authToken: 'fresh',
    });
    expect(tokens).toHaveBeenCalledWith({
      json: { name: 'app', access: VaultTokenAccess.FullAccess },
    });
    expect($post).not.toHaveBeenCalled();
  });

  it('provisions when no db exists', async () => {
    const { api, tokens, $post } = client({
      found: res(200, { vault: null }),
    });

    await expect(connectCloudVault(api, 'app')).resolves.toEqual({
      name: 'h-app',
      authToken: 'new',
    });
    expect($post).toHaveBeenCalledWith({ json: { name: 'app' } });
    expect(tokens).not.toHaveBeenCalled();
  });

  it('provisions when the lookup errors', async () => {
    const { api, $post } = client({ found: res(500, {}) });

    await connectCloudVault(api, 'app');

    expect($post).toHaveBeenCalled();
  });

  it('refuses an empty name, which means the default vault', async () => {
    const { api, $get } = client({ found: res(200, {}) });

    await expect(connectCloudVault(api, ' ')).rejects.toThrow(
      'vault name is required',
    );
    expect($get).not.toHaveBeenCalled();
  });

  it('surfaces a refused token', async () => {
    const { api } = client({
      found: res(200, { vault: { Name: 'h-app' } }),
      token: res(403, { error: 'no' }),
    });

    await expect(connectCloudVault(api, 'app')).rejects.toThrow('no');
  });

  it('surfaces a refused provision, like a plan cap', async () => {
    const { api } = client({
      found: res(200, { vault: null }),
      created: res(403, { error: 'cap' }),
    });

    await expect(connectCloudVault(api, 'app')).rejects.toThrow('cap');
  });
});
