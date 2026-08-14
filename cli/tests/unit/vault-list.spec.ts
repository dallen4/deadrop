import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lib/config', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('lib/log', () => ({
  logInfo: vi.fn(),
}));

vi.mock('process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('process')>();
  return { ...actual, exit: vi.fn() };
});

describe('vaultList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs each vault and marks the active one', async () => {
    const { loadConfig } = await import('lib/config');
    const { logInfo } = await import('lib/log');
    const { vaultList } = await import('actions/vault/list');

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'production' },
        vaults: {
          default: { location: '/tmp/default.db', environments: {} },
          other: { location: '/tmp/other.db', environments: {} },
        },
      },
      filepath: '/tmp/.deadroprc',
    } as any);

    await vaultList();

    expect(logInfo).toHaveBeenCalledTimes(2);
    expect(vi.mocked(logInfo).mock.calls[0][0]).toContain('default');
    expect(vi.mocked(logInfo).mock.calls[1][0]).toContain('other');
  });

  it('logs a helpful message when there are no vaults', async () => {
    const { loadConfig } = await import('lib/config');
    const { logInfo } = await import('lib/log');
    const { vaultList } = await import('actions/vault/list');

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: '', environment: '' },
        vaults: {},
      },
      filepath: '/tmp/.deadroprc',
    } as any);

    await vaultList();

    expect(logInfo).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logInfo).mock.calls[0][0]).toContain(
      'deadrop vault create',
    );
  });
});
