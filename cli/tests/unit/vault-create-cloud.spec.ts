import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lib/api', () => ({ createDeadropClient: vi.fn() }));
vi.mock('lib/config', () => ({
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
}));
vi.mock('lib/log', () => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));
vi.mock('db/init', () => ({ initDBClient: vi.fn() }));
vi.mock('db/vaults', () => ({
  vaultExists: (vaults: any, name: string) => vaults[name] ?? null,
}));
vi.mock('@shared/lib/vault-cloud', () => ({
  connectCloudVault: vi.fn(),
}));
vi.mock('@shared/db/attach', () => ({ attachCloudVault: vi.fn() }));

const exit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

const localVault = () => ({
  location: '/p/.deadrop/app.db',
  environments: { development: 'k' },
});

describe('vault create --cloud on an existing local vault', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { loadConfig } = await import('lib/config');
    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'app', environment: 'development' },
        vaults: { app: localVault() },
      },
      filepath: '/p/.deadroprc',
    } as any);
  });

  it('reattaches and saves the replica location', async () => {
    const { connectCloudVault } = await import('@shared/lib/vault-cloud');
    const { attachCloudVault } = await import('@shared/db/attach');
    const { saveConfig } = await import('lib/config');
    const { vaultCreate } = await import('actions/vault/create');
    const cloud = { name: 'h-app', authToken: 't' };
    vi.mocked(connectCloudVault).mockResolvedValue(cloud);
    vi.mocked(attachCloudVault).mockResolvedValue(
      '/p/.deadrop/app-cloud.db',
    );

    await vaultCreate('app', undefined, { cloud: true });

    expect(vi.mocked(connectCloudVault).mock.calls[0][1]).toBe('app');
    const saved = vi.mocked(saveConfig).mock.calls[0][1];
    expect(saved.vaults.app).toMatchObject({
      location: '/p/.deadrop/app-cloud.db',
      cloud,
    });
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('saves nothing when the attach fails', async () => {
    const { connectCloudVault } = await import('@shared/lib/vault-cloud');
    const { attachCloudVault } = await import('@shared/db/attach');
    const { saveConfig } = await import('lib/config');
    const { logError } = await import('lib/log');
    const { vaultCreate } = await import('actions/vault/create');
    vi.mocked(connectCloudVault).mockResolvedValue({
      name: 'h-app',
      authToken: 't',
    });
    vi.mocked(attachCloudVault).mockRejectedValue(new Error('offline'));

    await vaultCreate('app', undefined, { cloud: true });

    expect(vi.mocked(logError).mock.calls[0][0]).toContain('offline');
    expect(exit).toHaveBeenCalledWith(1);
    expect(saveConfig).not.toHaveBeenCalled();
  });
});
