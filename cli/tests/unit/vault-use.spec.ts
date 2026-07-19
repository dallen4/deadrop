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

describe('vaultUse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves the current environment when switching vaults without -e', async () => {
    const { loadConfig, saveConfig } = await import('lib/config');
    const { vaultExists } = await import('db/vaults');
    const { vaultUse } = await import('actions/vault/use');

    const vaults = {
      default: { location: '/tmp/default.db', environments: {} },
      other: { location: '/tmp/other.db', environments: {} },
    };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'production' },
        vaults,
      },
      filepath: '/tmp/.deadroprc',
    } as any);
    vi.mocked(vaultExists).mockReturnValue(vaults.other as any);

    await vaultUse('other');

    expect(saveConfig).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        active_vault: { name: 'other', environment: 'production' },
      }),
      true,
    );
  });

  it('switches the environment when -e is passed', async () => {
    const { loadConfig, saveConfig } = await import('lib/config');
    const { vaultExists } = await import('db/vaults');
    const { vaultUse } = await import('actions/vault/use');

    const vaults = {
      default: { location: '/tmp/default.db', environments: {} },
      other: { location: '/tmp/other.db', environments: {} },
    };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'development' },
        vaults,
      },
      filepath: '/tmp/.deadroprc',
    } as any);
    vi.mocked(vaultExists).mockReturnValue(vaults.other as any);

    await vaultUse('other', { environment: 'production' });

    expect(saveConfig).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        active_vault: { name: 'other', environment: 'production' },
      }),
      true,
    );
  });

  it('switches environment on the same vault when -e is passed', async () => {
    const { loadConfig, saveConfig } = await import('lib/config');
    const { vaultExists } = await import('db/vaults');
    const { vaultUse } = await import('actions/vault/use');

    const vaults = {
      default: { location: '/tmp/default.db', environments: {} },
    };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'development' },
        vaults,
      },
      filepath: '/tmp/.deadroprc',
    } as any);
    vi.mocked(vaultExists).mockReturnValue(vaults.default as any);

    await vaultUse('default', { environment: 'production' });

    expect(saveConfig).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        active_vault: { name: 'default', environment: 'production' },
      }),
      true,
    );
  });
});
