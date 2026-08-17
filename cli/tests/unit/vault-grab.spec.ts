import { beforeEach, describe, expect, it, vi } from 'vitest';
import { join } from 'path';

vi.mock('lib/config', () => ({
  findConfig: vi.fn(),
  saveConfig: vi.fn(),
}));

vi.mock('lib/global-config', () => ({
  globalConfigDir: () => '/app-data',
  globalConfigPath: () => '/app-data/.deadroprc',
}));

vi.mock('lib/log', () => ({ logInfo: vi.fn() }));

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
}));

const share = {
  environments: { production: 'prod-key' },
  cloud: { name: 'a1b2c3d4e5f67-acme', authToken: 'a-jwt' },
};

describe('saveGrabbedVault', () => {
  beforeEach(() => vi.clearAllMocks());

  it('merges into the found config and sets the vault active', async () => {
    const { findConfig, saveConfig } = await import('lib/config');
    const { saveGrabbedVault } = await import('logic/vault-grab');

    vi.mocked(findConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'other', environment: 'development' },
        vaults: {
          other: { location: '/proj/other.db', environments: {} },
        },
      },
      filepath: '/proj/.deadroprc',
      isEmpty: false,
    } as any);

    await saveGrabbedVault('acme', share);

    const [dir, config, overwrite] = vi.mocked(saveConfig).mock.calls[0];

    expect(dir).toBe('/proj');
    expect(overwrite).toBe(true);
    expect(config.active_vault).toEqual({
      name: 'acme',
      environment: 'production',
    });
    // Existing vault keeps its environment keys.
    expect(config.vaults.other).toBeDefined();
    expect(config.vaults.acme.cloud).toEqual(share.cloud);
  });

  it('allocates a replica path rather than trusting the sender', async () => {
    const { findConfig, saveConfig } = await import('lib/config');
    const { saveGrabbedVault } = await import('logic/vault-grab');

    vi.mocked(findConfig).mockResolvedValue({
      config: { active_vault: { name: 'x', environment: 'dev' }, vaults: {} },
      filepath: '/proj/.deadroprc',
      isEmpty: false,
    } as any);

    await saveGrabbedVault('acme', share);

    const [, config] = vi.mocked(saveConfig).mock.calls[0];

    expect(config.vaults.acme.location).toBe(
      join('/proj', 'vaults', 'acme.db'),
    );
  });

  it('prompts for a new name on collision, never overwriting', async () => {
    const { findConfig, saveConfig } = await import('lib/config');
    const { input } = await import('@inquirer/prompts');
    const { saveGrabbedVault } = await import('logic/vault-grab');

    vi.mocked(findConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'acme', environment: 'development' },
        vaults: {
          acme: {
            location: '/proj/acme.db',
            environments: { development: 'mine' },
          },
        },
      },
      filepath: '/proj/.deadroprc',
      isEmpty: false,
    } as any);
    vi.mocked(input).mockResolvedValue('acme-shared');

    await saveGrabbedVault('acme', share);

    const [, config] = vi.mocked(saveConfig).mock.calls[0];

    expect(config.vaults['acme-shared'].cloud).toEqual(share.cloud);
    expect(config.vaults.acme.environments).toEqual({
      development: 'mine',
    });
  });

  it('falls back to the remote name when the rename prompt is blank', async () => {
    const { findConfig, saveConfig } = await import('lib/config');
    const { input } = await import('@inquirer/prompts');
    const { saveGrabbedVault } = await import('logic/vault-grab');

    vi.mocked(findConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'acme', environment: 'development' },
        vaults: {
          acme: { location: '/proj/acme.db', environments: {} },
        },
      },
      filepath: '/proj/.deadroprc',
      isEmpty: false,
    } as any);
    vi.mocked(input).mockResolvedValue('   ');

    await saveGrabbedVault('acme', share);

    const [, config] = vi.mocked(saveConfig).mock.calls[0];

    expect(config.vaults['a1b2c3d4e5f67-acme']).toBeDefined();
  });

  it('prompts for a scope when no config exists anywhere', async () => {
    const { findConfig, saveConfig } = await import('lib/config');
    const { select } = await import('@inquirer/prompts');
    const { saveGrabbedVault } = await import('logic/vault-grab');

    vi.mocked(findConfig).mockResolvedValue(null);
    vi.mocked(select).mockResolvedValue('global');

    await saveGrabbedVault('acme', share);

    const [dir, config] = vi.mocked(saveConfig).mock.calls[0];

    expect(dir).toBe('/app-data');
    expect(config.vaults.acme.location).toBe(
      join('/app-data', 'vaults', 'acme.db'),
    );
    expect(config.active_vault.name).toBe('acme');
  });
});
