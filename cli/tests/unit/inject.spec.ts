import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runWithEnv } from 'lib/process';

describe('runWithEnv', () => {
  it('injects secrets into the child process env', async () => {
    const exitCode = await runWithEnv(
      'node',
      ['-e', 'process.exit(process.env.FOO === "bar" ? 0 : 7)'],
      { FOO: 'bar' },
    );
    expect(exitCode).toEqual(0);
  });

  it('does not inject a mismatched value', async () => {
    const exitCode = await runWithEnv(
      'node',
      ['-e', 'process.exit(process.env.FOO === "bar" ? 0 : 7)'],
      { FOO: 'nope' },
    );
    expect(exitCode).toEqual(7);
  });

  it('lets vault values override existing process env by default', async () => {
    process.env.FOO = 'existing';
    const exitCode = await runWithEnv(
      'node',
      ['-e', 'process.exit(process.env.FOO === "secret" ? 0 : 7)'],
      { FOO: 'secret' },
    );
    delete process.env.FOO;
    expect(exitCode).toEqual(0);
  });

  it('lets existing process env win with override: false', async () => {
    process.env.FOO = 'existing';
    const exitCode = await runWithEnv(
      'node',
      ['-e', 'process.exit(process.env.FOO === "existing" ? 0 : 7)'],
      { FOO: 'secret' },
      { override: false },
    );
    delete process.env.FOO;
    expect(exitCode).toEqual(0);
  });

  it('rejects when the command is not found', async () => {
    await expect(
      runWithEnv('definitely-not-a-real-bin-xyz', [], {}),
    ).rejects.toThrow('Command not found');
  });
});

vi.mock('lib/log', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock('db/init', () => ({
  initDBClient: vi.fn(),
}));

vi.mock('@shared/db/secrets', () => ({
  createSecretsHelpers: vi.fn(),
}));

vi.mock('lib/config', () => ({
  loadConfig: vi.fn(),
  loadConfigFromPath: vi.fn(),
}));

describe('inject', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exits 1 with no command', async () => {
    const { logError } = await import('lib/log');
    const { inject } = await import('actions/inject');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    await expect(inject([], { override: true })).rejects.toThrow('exit');

    expect(logError).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('resolves the active vault/environment, runs the command, and closes the db', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } = await import(
      '@shared/db/secrets'
    );
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();
    const secrets = { FOO: 'bar' };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: { default: { location: './vault.db', environments: {} } },
      },
    } as any);
    vi.mocked(initDBClient).mockResolvedValue({
      $client: { close },
    } as any);
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue(secrets),
    } as any);
    const runWithEnvSpy = vi
      .spyOn(processModule, 'runWithEnv')
      .mockResolvedValue(3);

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await inject(['node', '-e', 'process.exit(3)'], { override: true });

    expect(initDBClient).toHaveBeenCalledWith('./vault.db', undefined);
    expect(runWithEnvSpy).toHaveBeenCalledWith(
      'node',
      ['-e', 'process.exit(3)'],
      secrets,
      { override: true },
    );
    expect(close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(3);
    exitSpy.mockRestore();
    runWithEnvSpy.mockRestore();
  });

  it('exits 127 with a clean error when the command is not found', async () => {
    const { logError } = await import('lib/log');
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } = await import(
      '@shared/db/secrets'
    );
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: { default: { location: './vault.db', environments: {} } },
      },
    } as any);
    vi.mocked(initDBClient).mockResolvedValue({
      $client: { close },
    } as any);
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue({}),
    } as any);
    const runWithEnvSpy = vi
      .spyOn(processModule, 'runWithEnv')
      .mockRejectedValue(new Error('Command not found: nope'));

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await inject(['nope'], { override: true });

    expect(logError).toHaveBeenCalledWith('Command not found: nope');
    expect(close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(127);
    exitSpy.mockRestore();
    runWithEnvSpy.mockRestore();
  });
});
