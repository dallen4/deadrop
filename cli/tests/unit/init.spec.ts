import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('lib/log', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  displayWelcomeMessage: vi.fn(),
}));

vi.mock('db/init', () => ({
  initDBClient: vi.fn().mockResolvedValue({
    $client: { close: vi.fn() },
  }),
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn().mockResolvedValue(false),
}));

// Real filesystem: the whole point is where the file actually lands, which
// a mocked fs would assert nothing about.
describe('init --global', () => {
  let home: string;
  let projectDir: string;
  const realCwd = process.cwd();
  const realHome = process.env.HOME;

  beforeEach(() => {
    vi.clearAllMocks();
    home = mkdtempSync(join(tmpdir(), 'deadrop-home-'));
    projectDir = mkdtempSync(join(tmpdir(), 'deadrop-proj-'));
    // os.homedir() reads $HOME on POSIX, which is what globalConfigDir uses.
    process.env.HOME = home;
    process.chdir(projectDir);
  });

  afterEach(() => {
    process.chdir(realCwd);
    if (realHome) process.env.HOME = realHome;
    rmSync(home, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('writes the config into the OS app-data dir, not the cwd', async () => {
    const init = (await import('actions/init')).default;
    const { globalConfigPath, globalConfigDir } =
      await import('lib/global-config');
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await init({ global: true, yes: true });

    expect(existsSync(globalConfigPath())).toBe(true);
    expect(existsSync(join(globalConfigDir(), '.deadrop'))).toBe(
      true,
    );
    // A global init must not leave anything behind in the project.
    expect(existsSync(join(projectDir, '.deadroprc'))).toBe(false);
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('points the default vault at the global dir', async () => {
    const init = (await import('actions/init')).default;
    const { loadConfigFromPath } = await import('lib/config');
    const { globalConfigPath, globalConfigDir } =
      await import('lib/global-config');
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await init({ global: true, yes: true });

    const { config } = await loadConfigFromPath(globalConfigPath());

    expect(config.vaults.default.location).toContain(
      globalConfigDir(),
    );
  });

  it('writes into the cwd without the flag', async () => {
    const init = (await import('actions/init')).default;
    const { globalConfigPath } = await import('lib/global-config');
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await init({ yes: false });

    expect(existsSync(join(projectDir, '.deadroprc'))).toBe(true);
    expect(existsSync(globalConfigPath())).toBe(false);
  });

  // The dir does not exist on a machine that has never run the desktop app.
  it('creates the app-data dir when it is missing', async () => {
    const init = (await import('actions/init')).default;
    const { globalConfigDir } = await import('lib/global-config');
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    expect(existsSync(globalConfigDir())).toBe(false);

    await init({ global: true, yes: true });

    expect(existsSync(globalConfigDir())).toBe(true);
  });
});
