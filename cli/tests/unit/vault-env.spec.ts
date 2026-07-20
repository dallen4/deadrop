import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lib/config', () => ({
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
}));

vi.mock('lib/log', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock('db/vaults', () => ({
  vaultExists: vi.fn(),
}));

vi.mock('process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('process')>();
  return { ...actual, exit: vi.fn() };
});

describe('vaultEnvList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists the environments of the active vault', async () => {
    const { loadConfig } = await import('lib/config');
    const { vaultExists } = await import('db/vaults');
    const { logInfo, logError } = await import('lib/log');
    const { exit } = await import('process');
    const { vaultEnvList } = await import('actions/vault/env');

    const vaultConfig = {
      location: '/tmp/vault.db',
      environments: { development: 'devkey', production: 'prodkey' },
    };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'development' },
        vaults: { default: vaultConfig },
      },
      filepath: '/tmp/.deadroprc',
    } as any);
    vi.mocked(vaultExists).mockReturnValue(vaultConfig as any);

    await vaultEnvList();

    expect(logInfo).toHaveBeenCalledWith('* development');
    expect(logInfo).toHaveBeenCalledWith('  production');
    expect(logError).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
  });
});

describe('vaultEnvAdd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a newly generated key for the environment', async () => {
    const { loadConfig, saveConfig } = await import('lib/config');
    const { vaultExists } = await import('db/vaults');
    const { logInfo } = await import('lib/log');
    const { exit } = await import('process');
    const { vaultEnvAdd } = await import('actions/vault/env');

    const vaultConfig = {
      location: '/tmp/vault.db',
      environments: { development: 'devkey' } as Record<
        string,
        string
      >,
    };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'development' },
        vaults: { default: vaultConfig },
      },
      filepath: '/tmp/.deadroprc',
    } as any);
    vi.mocked(vaultExists).mockReturnValue(vaultConfig as any);

    await vaultEnvAdd('preview');

    expect(vaultConfig.environments.preview).toBeDefined();
    expect(vaultConfig.environments.preview).not.toEqual('devkey');
    expect(saveConfig).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining("Environment 'preview' added"),
    );
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('errors when the environment already exists', async () => {
    const { loadConfig, saveConfig } = await import('lib/config');
    const { vaultExists } = await import('db/vaults');
    const { logError } = await import('lib/log');
    const { exit } = await import('process');
    const { vaultEnvAdd } = await import('actions/vault/env');

    const vaultConfig = {
      location: '/tmp/vault.db',
      environments: { development: 'devkey' },
    };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'development' },
        vaults: { default: vaultConfig },
      },
      filepath: '/tmp/.deadroprc',
    } as any);
    vi.mocked(vaultExists).mockReturnValue(vaultConfig as any);

    await vaultEnvAdd('development');

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining(
        "Environment 'development' already exists",
      ),
    );
    expect(saveConfig).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });
});
