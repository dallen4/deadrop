import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runWithEnv } from 'lib/process';

const REPLICA_SIDECARS = ['', '-wal', '-shm', '-info'];

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

vi.mock('lib/auth/vault-token', () => ({
  mintVaultToken: vi.fn(),
  VaultNotFoundError: class VaultNotFoundError extends Error {},
}));

describe('inject', () => {
  beforeEach(() => vi.clearAllMocks());

  afterEach(() => {
    delete process.env.DEADROP_VAULT_KEY;
    delete process.env.DEADROP_VAULT;
    delete process.env.DEADROP_ENVIRONMENT;
  });

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

  it('resolves the active vault/environment, mints a token, runs the command, and closes the db', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } = await import(
      '@shared/db/secrets'
    );
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();
    const secrets = { FOO: 'bar' };
    const minted = {
      authToken: 'minted-token',
      syncUrl: 'libsql://default.turso.io',
    };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: { default: { location: './vault.db', environments: {} } },
      },
    } as any);
    vi.mocked(mintVaultToken).mockResolvedValue(minted);
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

    expect(mintVaultToken).toHaveBeenCalledWith('default');
    expect(initDBClient).toHaveBeenCalledWith('./vault.db', {
      name: 'default',
      ...minted,
    });
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

  it('does not re-mint when the config already has a token', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } = await import(
      '@shared/db/secrets'
    );
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();
    const cloud = {
      name: 'default',
      syncUrl: 'libsql://default.turso.io',
      authToken: 'existing-token',
    };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: {
          default: { location: './vault.db', environments: {}, cloud },
        },
      },
    } as any);
    vi.mocked(initDBClient).mockResolvedValue({
      $client: { close },
    } as any);
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue({}),
    } as any);
    vi.spyOn(processModule, 'runWithEnv').mockResolvedValue(0);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await inject(['node'], { override: true });

    expect(mintVaultToken).not.toHaveBeenCalled();
    expect(initDBClient).toHaveBeenCalledWith('./vault.db', cloud);
  });

  it('--refresh-token forces a re-mint even when a token exists', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } = await import(
      '@shared/db/secrets'
    );
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();
    const cloud = {
      name: 'default',
      syncUrl: 'libsql://default.turso.io',
      authToken: 'existing-token',
    };
    const minted = {
      authToken: 'refreshed-token',
      syncUrl: 'libsql://default.turso.io',
    };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: {
          default: { location: './vault.db', environments: {}, cloud },
        },
      },
    } as any);
    vi.mocked(mintVaultToken).mockResolvedValue(minted);
    vi.mocked(initDBClient).mockResolvedValue({
      $client: { close },
    } as any);
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue({}),
    } as any);
    vi.spyOn(processModule, 'runWithEnv').mockResolvedValue(0);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await inject(['node'], { override: true, refreshToken: true });

    expect(mintVaultToken).toHaveBeenCalledWith('default');
    expect(initDBClient).toHaveBeenCalledWith('./vault.db', {
      name: 'default',
      ...minted,
    });
  });

  it('surfaces VaultNotFoundError cleanly instead of the generic message', async () => {
    const { logError } = await import('lib/log');
    const { loadConfig } = await import('lib/config');
    const { mintVaultToken, VaultNotFoundError } = await import(
      'lib/auth/vault-token'
    );
    const { inject } = await import('actions/inject');

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: { default: { location: './vault.db', environments: {} } },
      },
    } as any);
    vi.mocked(mintVaultToken).mockRejectedValue(
      new VaultNotFoundError("Vault 'default' not found."),
    );

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => {
        throw new Error('exit');
      });

    await expect(inject(['node'], { override: true })).rejects.toThrow(
      'exit',
    );

    expect(logError).toHaveBeenCalledWith("Vault 'default' not found.");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('config-free: resolves vault from env vars without loadConfig', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } = await import(
      '@shared/db/secrets'
    );
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();
    const secrets = { FOO: 'bar' };
    const minted = {
      authToken: 'minted-token',
      syncUrl: 'libsql://default.turso.io',
    };

    process.env.DEADROP_VAULT_KEY = 'aes-key';
    process.env.DEADROP_ENVIRONMENT = 'production';

    vi.mocked(mintVaultToken).mockResolvedValue(minted);
    vi.mocked(initDBClient).mockResolvedValue({
      $client: { close },
    } as any);
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue(secrets),
    } as any);
    vi.spyOn(processModule, 'runWithEnv').mockResolvedValue(0);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await inject(['node'], { override: true });

    expect(loadConfig).not.toHaveBeenCalled();
    // Default vault: no name given via -v or DEADROP_VAULT.
    expect(mintVaultToken).toHaveBeenCalledWith(undefined);
  });

  it('exits 127 with a clean error when the command is not found', async () => {
    const { logError } = await import('lib/log');
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } = await import(
      '@shared/db/secrets'
    );
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: { default: { location: './vault.db', environments: {} } },
      },
    } as any);
    vi.mocked(mintVaultToken).mockResolvedValue({
      authToken: 'minted-token',
      syncUrl: 'libsql://default.turso.io',
    });
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

  it('config-free: removes the temp replica and its sidecars on exit', async () => {
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } = await import(
      '@shared/db/secrets'
    );
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    process.env.DEADROP_VAULT_KEY = 'aes-key';
    process.env.DEADROP_ENVIRONMENT = 'production';

    // initDBClient receives the temp path inject chose; write the real db
    // plus sync sidecars there so the cleanup runs against real files.
    let replicaPath = '';
    vi.mocked(initDBClient).mockImplementation(async (path: string) => {
      replicaPath = path;
      for (const suffix of REPLICA_SIDECARS)
        writeFileSync(`${path}${suffix}`, 'x');
      return { $client: { close: vi.fn() } } as any;
    });
    vi.mocked(mintVaultToken).mockResolvedValue({
      authToken: 'minted-token',
      syncUrl: 'libsql://default.turso.io',
    });
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue({ FOO: 'bar' }),
    } as any);
    vi.spyOn(processModule, 'runWithEnv').mockResolvedValue(0);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await inject(['node'], { override: true });

    expect(replicaPath).toContain('deadrop-inject-');
    for (const suffix of REPLICA_SIDECARS)
      expect(existsSync(`${replicaPath}${suffix}`)).toBe(false);
  });

  it('config-based: never deletes the real vault db file', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } = await import(
      '@shared/db/secrets'
    );
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const vaultDb = join(
      tmpdir(),
      `deadrop-real-vault-${Date.now()}.db`,
    );
    writeFileSync(vaultDb, 'real-vault-data');

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: {
          default: {
            location: vaultDb,
            environments: {},
            // Cached token present, so inject won't try to re-mint.
            cloud: {
              name: 'default',
              syncUrl: 'libsql://default.turso.io',
              authToken: 'cached-token',
            },
          },
        },
      },
    } as any);
    vi.mocked(initDBClient).mockResolvedValue({
      $client: { close: vi.fn() },
    } as any);
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue({}),
    } as any);
    vi.spyOn(processModule, 'runWithEnv').mockResolvedValue(0);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    try {
      await inject(['node'], { override: true });
      expect(existsSync(vaultDb)).toBe(true);
    } finally {
      rmSync(vaultDb, { force: true });
    }
  });
});
