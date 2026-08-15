import { beforeEach, describe, expect, it, vi } from 'vitest';

const search = vi.fn();

vi.mock('cosmiconfig', () => ({
  cosmiconfig: () => ({ search }),
}));

vi.mock('lib/global-config', () => ({
  globalConfigExists: vi.fn(),
  globalConfigPath: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('lib/log', () => ({
  displayWelcomeMessage: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

describe('findConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the project-scoped config when cosmiconfig finds one', async () => {
    const { findConfig } = await import('lib/config');

    const found = {
      config: { active_vault: {}, vaults: {} },
      filepath: '/project/.deadroprc',
      isEmpty: false,
    };
    search.mockResolvedValue(found);

    expect(await findConfig()).toBe(found);
  });

  it('falls back to the global config when there is no project one', async () => {
    const { globalConfigExists, globalConfigPath } = await import(
      'lib/global-config'
    );
    const { readFile } = await import('fs/promises');
    const { findConfig } = await import('lib/config');

    search.mockResolvedValue(null);
    vi.mocked(globalConfigExists).mockReturnValue(true);
    vi.mocked(globalConfigPath).mockReturnValue('/app-data/.deadroprc');
    vi.mocked(readFile).mockResolvedValue(
      'active_vault:\n  name: default\n  environment: development\nvaults: {}\n',
    );

    const result = await findConfig();

    expect(result?.filepath).toBe('/app-data/.deadroprc');
    expect(result?.config.active_vault.name).toBe('default');
  });

  it('returns null instead of exiting when nothing is found', async () => {
    const { globalConfigExists } = await import('lib/global-config');
    const { findConfig } = await import('lib/config');

    search.mockResolvedValue(null);
    vi.mocked(globalConfigExists).mockReturnValue(false);

    expect(await findConfig()).toBeNull();
  });
});

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('still exits when no config is found', async () => {
    const { globalConfigExists } = await import('lib/global-config');
    const { logError } = await import('lib/log');
    const { loadConfig } = await import('lib/config');

    search.mockResolvedValue(null);
    vi.mocked(globalConfigExists).mockReturnValue(false);

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => {
        throw new Error('exit');
      });

    await expect(loadConfig()).rejects.toThrow('exit');

    expect(logError).toHaveBeenCalledWith(
      'No config found, please run `deadrop init` to get started.',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
