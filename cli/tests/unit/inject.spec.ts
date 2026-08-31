import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
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
  logWarning: vi.fn(),
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

// Keeps the real vault-token module (and so the real MintStrategy /
// resolveMintStrategy) out of @clerk/clerk-js, which pulls in a browser
// runtime on import.
vi.mock('lib/auth/clerk', () => ({
  getSessionToken: vi.fn(),
}));

vi.mock('@shared/client', () => ({
  createClient: vi.fn(),
}));

// Only the two network calls are stubbed — strategy resolution stays real,
// since which strategy a given env produces is the thing worth testing.
vi.mock('lib/auth/vault-token', async (importOriginal) => ({
  ...(await importOriginal<typeof import('lib/auth/vault-token')>()),
  mintVaultToken: vi.fn(),
  mintVaultTokenWithApiKey: vi.fn(),
}));

const clearInjectEnv = () => {
  delete process.env.DEADROP_VAULT_KEY;
  delete process.env.DEADROP_VAULT;
  delete process.env.DEADROP_ENVIRONMENT;
  delete process.env.DEADROP_API_KEY;
};

// Mints resolve a tick late so they behave like the network call they
// stand in for. A same-microtask mock lets an unawaited mint still win the
// race against initDBClient, which hides a real ordering bug.
const minted =
  <T>(creds: T) =>
  () =>
    new Promise<T>((resolve) => setTimeout(() => resolve(creds), 0));

describe('resolveMintStrategy', () => {
  beforeEach(clearInjectEnv);
  afterEach(clearInjectEnv);

  const localVault = { vault: {}, ephemeral: false };
  const cloudVault = (authToken?: string) => ({
    vault: { cloud: { name: 'a1b2c3d4e5f67-default', authToken } },
    ephemeral: false,
  });

  it('is None for a local vault with no cloud config', async () => {
    const { MintStrategy, resolveMintStrategy } =
      await import('lib/auth/vault-token');

    expect(resolveMintStrategy(localVault)).toBe(MintStrategy.None);
  });

  it('is Cached when a token exists and no refresh was asked for', async () => {
    const { MintStrategy, resolveMintStrategy } =
      await import('lib/auth/vault-token');

    expect(resolveMintStrategy(cloudVault('cached'))).toBe(
      MintStrategy.Cached,
    );
  });

  it('is Session when --refresh-token overrides a cached token', async () => {
    const { MintStrategy, resolveMintStrategy } =
      await import('lib/auth/vault-token');

    expect(resolveMintStrategy(cloudVault('cached'), true)).toBe(
      MintStrategy.Session,
    );
  });

  it('is Session for a cloud vault with no cached token', async () => {
    const { MintStrategy, resolveMintStrategy } =
      await import('lib/auth/vault-token');

    expect(resolveMintStrategy(cloudVault())).toBe(
      MintStrategy.Session,
    );
  });

  it('is ApiKey when an ephemeral run has DEADROP_API_KEY', async () => {
    const { MintStrategy, resolveMintStrategy } =
      await import('lib/auth/vault-token');

    process.env.DEADROP_API_KEY = 'sk_test';

    expect(resolveMintStrategy({ vault: {}, ephemeral: true })).toBe(
      MintStrategy.ApiKey,
    );
  });

  it('ignores --refresh-token on the API key path', async () => {
    const { MintStrategy, resolveMintStrategy } =
      await import('lib/auth/vault-token');

    process.env.DEADROP_API_KEY = 'sk_test';

    // Ephemeral replicas have no token cache, so a refresh is meaningless
    // there — the flag must not knock the run off the machine path.
    expect(
      resolveMintStrategy({ vault: {}, ephemeral: true }, true),
    ).toBe(MintStrategy.ApiKey);
  });

  it('is Session for an ephemeral run with no API key', async () => {
    const { MintStrategy, resolveMintStrategy } =
      await import('lib/auth/vault-token');

    expect(resolveMintStrategy({ vault: {}, ephemeral: true })).toBe(
      MintStrategy.Session,
    );
  });

  it('never picks ApiKey for a config-backed vault', async () => {
    const { MintStrategy, resolveMintStrategy } =
      await import('lib/auth/vault-token');

    // An API key can't supply DEADROP_VAULT_KEY, so a stray one in the
    // shell must not hijack the vault a local config already named.
    process.env.DEADROP_API_KEY = 'sk_test';

    expect(resolveMintStrategy(cloudVault())).toBe(
      MintStrategy.Session,
    );
  });
});

describe('inject', () => {
  beforeEach(() => vi.clearAllMocks());

  afterEach(clearInjectEnv);

  it('exits 1 with no command', async () => {
    const { logError } = await import('lib/log');
    const { inject } = await import('actions/inject');
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => {
        throw new Error('exit');
      });

    await expect(inject([], { override: true })).rejects.toThrow(
      'exit',
    );

    expect(logError).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('resolves the active vault/environment, mints a token, runs the command, and closes the db', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } =
      await import('@shared/db/secrets');
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();
    const secrets = { FOO: 'bar' };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: {
          default: {
            location: './vault.db',
            environments: {},
            cloud: {
              name: 'default',
            },
          },
        },
      },
    } as any);
    vi.mocked(mintVaultToken).mockImplementation(
      minted({
        token: 'minted-token',
        name: 'a1b2c3d4e5f67-default',
      }),
    );
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

    await inject(['node', '-e', 'process.exit(3)'], {
      override: true,
    });

    // The local label is sent; the worker prefixes it into a remote name.
    expect(mintVaultToken).toHaveBeenCalledWith('default');
    // cloud is rebuilt from the mint, so the sync URL uses the remote name.
    expect(initDBClient).toHaveBeenCalledWith('./vault.db', {
      name: 'a1b2c3d4e5f67-default',
      authToken: 'minted-token',
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
    const { createSecretsHelpers } =
      await import('@shared/db/secrets');
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();
    const cloud = {
      name: 'default',
      authToken: 'existing-token',
    };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: {
          default: {
            location: './vault.db',
            environments: {},
            cloud,
          },
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
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await inject(['node'], { override: true });

    expect(mintVaultToken).not.toHaveBeenCalled();
    expect(initDBClient).toHaveBeenCalledWith('./vault.db', cloud);
  });

  it('local vault (no cloud config): does not mint, reads locally', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } =
      await import('@shared/db/secrets');
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: {
          default: { location: './vault.db', environments: {} },
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
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await inject(['node'], { override: true });

    expect(mintVaultToken).not.toHaveBeenCalled();
    expect(initDBClient).toHaveBeenCalledWith(
      './vault.db',
      undefined,
    );
  });

  it('--refresh-token forces a re-mint even when a token exists', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } =
      await import('@shared/db/secrets');
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();
    const cloud = {
      name: 'default',
      authToken: 'existing-token',
    };

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: {
          default: {
            location: './vault.db',
            environments: {},
            cloud,
          },
        },
      },
    } as any);
    vi.mocked(mintVaultToken).mockImplementation(
      minted({
        token: 'refreshed-token',
        name: 'a1b2c3d4e5f67-default',
      }),
    );
    vi.mocked(initDBClient).mockResolvedValue({
      $client: { close },
    } as any);
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue({}),
    } as any);
    vi.spyOn(processModule, 'runWithEnv').mockResolvedValue(0);
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await inject(['node'], { override: true, refreshToken: true });

    expect(mintVaultToken).toHaveBeenCalledWith('default');
    expect(initDBClient).toHaveBeenCalledWith('./vault.db', {
      name: 'a1b2c3d4e5f67-default',
      authToken: 'refreshed-token',
    });
  });

  it('surfaces VaultNotFoundError cleanly instead of the generic message', async () => {
    const { logError } = await import('lib/log');
    const { loadConfig } = await import('lib/config');
    const { mintVaultToken, VaultNotFoundError } =
      await import('lib/auth/vault-token');
    const { inject } = await import('actions/inject');

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: {
          default: {
            location: './vault.db',
            environments: {},
            cloud: {
              name: 'default',
            },
          },
        },
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

    await expect(
      inject(['node'], { override: true }),
    ).rejects.toThrow('exit');

    expect(logError).toHaveBeenCalledWith(
      "Vault 'default' not found.",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('reports a failed mint instead of throwing a raw error', async () => {
    const { logError } = await import('lib/log');
    const { loadConfig } = await import('lib/config');
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const { inject } = await import('actions/inject');

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: {
          default: {
            location: './vault.db',
            environments: {},
            cloud: { name: 'default' },
          },
        },
      },
    } as any);
    vi.mocked(mintVaultToken).mockRejectedValue(
      new Error('No session token found!'),
    );

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => {
        throw new Error('exit');
      });

    await expect(
      inject(['node'], { override: true }),
    ).rejects.toThrow('exit');

    expect(vi.mocked(logError).mock.calls[0][0]).toContain(
      'deadrop login',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('config-free: resolves vault from env vars without loadConfig', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } =
      await import('@shared/db/secrets');
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();
    const secrets = { FOO: 'bar' };

    process.env.DEADROP_VAULT_KEY = 'aes-key';
    process.env.DEADROP_ENVIRONMENT = 'production';

    vi.mocked(mintVaultToken).mockImplementation(
      minted({
        token: 'minted-token',
        name: 'a1b2c3d4e5f67-default',
      }),
    );
    vi.mocked(initDBClient).mockResolvedValue({
      $client: { close },
    } as any);
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue(secrets),
    } as any);
    vi.spyOn(processModule, 'runWithEnv').mockResolvedValue(0);
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await inject(['node'], { override: true });

    expect(loadConfig).not.toHaveBeenCalled();
    // Default vault label: no name given via -v or DEADROP_VAULT.
    expect(mintVaultToken).toHaveBeenCalledWith('default');
    // The env key decrypts the one environment CI named.
    expect(
      vi.mocked(createSecretsHelpers).mock.calls[0][0],
    ).toMatchObject({ environments: { production: 'aes-key' } });
  });

  it('config-free: exits 1 when no environment is given', async () => {
    const { logError } = await import('lib/log');
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const { inject } = await import('actions/inject');

    process.env.DEADROP_VAULT_KEY = 'aes-key';

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => {
        throw new Error('exit');
      });

    await expect(
      inject(['node'], { override: true }),
    ).rejects.toThrow('exit');

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('No environment specified'),
    );
    expect(mintVaultToken).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('CI: mints with the API key and takes the environment from its claims', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } =
      await import('@shared/db/secrets');
    const { logInfo } = await import('lib/log');
    const { mintVaultToken, mintVaultTokenWithApiKey } =
      await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    // The two variables a pipeline actually sets — no DEADROP_ENVIRONMENT.
    process.env.DEADROP_VAULT_KEY = 'aes-key';
    process.env.DEADROP_API_KEY = 'sk_test';

    vi.mocked(mintVaultTokenWithApiKey).mockImplementation(
      minted({
        token: 'ci-token',
        name: 'a1b2c3d4e5f67-my-app',
        environment: 'production',
      }),
    );
    vi.mocked(initDBClient).mockResolvedValue({
      $client: { close: vi.fn() },
    } as any);
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue({ FOO: 'bar' }),
    } as any);
    vi.spyOn(processModule, 'runWithEnv').mockResolvedValue(0);
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await inject(['node'], { override: true, ci: true });

    expect(loadConfig).not.toHaveBeenCalled();
    expect(mintVaultToken).not.toHaveBeenCalled();
    expect(initDBClient).toHaveBeenCalledWith(
      expect.stringContaining('deadrop-inject-'),
      { name: 'a1b2c3d4e5f67-my-app', authToken: 'ci-token' },
    );
    expect(
      vi.mocked(createSecretsHelpers).mock.calls[0][0],
    ).toMatchObject({ environments: { production: 'aes-key' } });
    // The key's claims, not the 'default' placeholder, name the vault.
    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining("'a1b2c3d4e5f67-my-app' (production)"),
    );
  });

  it('CI: --refresh-token does not knock the run off the API key path', async () => {
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } =
      await import('@shared/db/secrets');
    const { mintVaultToken, mintVaultTokenWithApiKey } =
      await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    process.env.DEADROP_VAULT_KEY = 'aes-key';
    process.env.DEADROP_API_KEY = 'sk_test';

    vi.mocked(mintVaultTokenWithApiKey).mockImplementation(
      minted({
        token: 'ci-token',
        name: 'a1b2c3d4e5f67-my-app',
        environment: 'production',
      }),
    );
    vi.mocked(initDBClient).mockResolvedValue({
      $client: { close: vi.fn() },
    } as any);
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue({}),
    } as any);
    vi.spyOn(processModule, 'runWithEnv').mockResolvedValue(0);
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await inject(['node'], { override: true, refreshToken: true });

    expect(mintVaultTokenWithApiKey).toHaveBeenCalled();
    expect(mintVaultToken).not.toHaveBeenCalled();
  });

  it('--ci exits 1 when DEADROP_API_KEY is missing', async () => {
    const { logError } = await import('lib/log');
    const { mintVaultTokenWithApiKey } =
      await import('lib/auth/vault-token');
    const { inject } = await import('actions/inject');

    process.env.DEADROP_VAULT_KEY = 'aes-key';

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => {
        throw new Error('exit');
      });

    await expect(
      inject(['node'], { override: true, ci: true }),
    ).rejects.toThrow('exit');

    // Fails fast by name rather than falling back to a session mint.
    expect(logError).toHaveBeenCalledWith(
      '--ci requires DEADROP_API_KEY to be set.',
    );
    expect(mintVaultTokenWithApiKey).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('warns rather than silently dropping --config on the config-free path', async () => {
    const { logWarning } = await import('lib/log');
    const { loadConfigFromPath } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } =
      await import('@shared/db/secrets');
    const { mintVaultTokenWithApiKey } =
      await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    process.env.DEADROP_VAULT_KEY = 'aes-key';
    process.env.DEADROP_API_KEY = 'sk_test';

    vi.mocked(mintVaultTokenWithApiKey).mockImplementation(
      minted({
        token: 'ci-token',
        name: 'a1b2c3d4e5f67-my-app',
        environment: 'production',
      }),
    );
    vi.mocked(initDBClient).mockResolvedValue({
      $client: { close: vi.fn() },
    } as any);
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue({}),
    } as any);
    vi.spyOn(processModule, 'runWithEnv').mockResolvedValue(0);
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await inject(['node'], {
      override: true,
      config: './ci.deadroprc',
    });

    expect(logWarning).toHaveBeenCalledWith(
      expect.stringContaining('Ignoring --config'),
    );
    expect(loadConfigFromPath).not.toHaveBeenCalled();
  });

  it('exits 127 with a clean error when the command is not found', async () => {
    const { logError } = await import('lib/log');
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } =
      await import('@shared/db/secrets');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    const close = vi.fn();

    vi.mocked(loadConfig).mockResolvedValue({
      config: {
        active_vault: { name: 'default', environment: 'dev' },
        vaults: {
          default: { location: './vault.db', environments: {} },
        },
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

  it('config-free: removes the temp replica and its sidecars on exit', async () => {
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } =
      await import('@shared/db/secrets');
    const { mintVaultToken } = await import('lib/auth/vault-token');
    const processModule = await import('lib/process');
    const { inject } = await import('actions/inject');

    process.env.DEADROP_VAULT_KEY = 'aes-key';
    process.env.DEADROP_ENVIRONMENT = 'production';

    // initDBClient receives the temp path inject chose; write the real db
    // plus sync sidecars there so the cleanup runs against real files.
    let replicaPath = '';
    vi.mocked(initDBClient).mockImplementation(
      async (path: string) => {
        replicaPath = path;
        for (const suffix of REPLICA_SIDECARS)
          writeFileSync(`${path}${suffix}`, 'x');
        return { $client: { close: vi.fn() } } as any;
      },
    );
    vi.mocked(mintVaultToken).mockImplementation(
      minted({
        token: 'minted-token',
        name: 'a1b2c3d4e5f67-default',
      }),
    );
    vi.mocked(createSecretsHelpers).mockReturnValue({
      getAllSecrets: vi.fn().mockResolvedValue({ FOO: 'bar' }),
    } as any);
    vi.spyOn(processModule, 'runWithEnv').mockResolvedValue(0);
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    await inject(['node'], { override: true });

    expect(replicaPath).toContain('deadrop-inject-');
    for (const suffix of REPLICA_SIDECARS)
      expect(existsSync(`${replicaPath}${suffix}`)).toBe(false);
  });

  it('config-based: never deletes the real vault db file', async () => {
    const { loadConfig } = await import('lib/config');
    const { initDBClient } = await import('db/init');
    const { createSecretsHelpers } =
      await import('@shared/db/secrets');
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
    vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    try {
      await inject(['node'], { override: true });
      expect(existsSync(vaultDb)).toBe(true);
    } finally {
      rmSync(vaultDb, { force: true });
    }
  });
});
