import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lib/api', () => ({ createDeadropClient: vi.fn() }));
vi.mock('lib/config', () => ({ loadConfig: vi.fn() }));
vi.mock('lib/log', () => ({
  canReveal: vi.fn(),
  logDebug: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarning: vi.fn(),
  revealSecret: vi.fn(),
}));
vi.mock('process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('process')>();
  return { ...actual, exit: vi.fn() };
});

const config = {
  active_vault: { name: 'app', environment: 'production' },
  vaults: {
    app: {
      location: '/tmp/app.db',
      environments: { production: 'k' },
      cloud: { name: 'a1b2c3d4e5f67-app', authToken: 't' },
    },
  },
};

const setup = async (response: object) => {
  const { createDeadropClient } = await import('lib/api');
  const { loadConfig } = await import('lib/config');
  const $get = vi.fn().mockResolvedValue(response);

  vi.mocked(loadConfig).mockResolvedValue({ config } as any);
  vi.mocked(createDeadropClient).mockResolvedValue({
    auth: { keys: { $get } },
  } as any);

  return $get;
};

describe('listApiKeys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the keys for the vault environment', async () => {
    const $get = await setup({
      ok: true,
      json: async () => [
        { name: 'ci', expired: false, revoked: false, claims: {} },
        {
          name: 'deploy',
          expired: false,
          revoked: true,
          claims: { only: ['DB_URL'], prefix: 'APP_' },
        },
      ],
    });
    const { logInfo } = await import('lib/log');
    const { listApiKeys } = await import('actions/apiKeys');

    await listApiKeys({ vault: 'app', environment: 'production' });

    expect($get.mock.calls[0][0].query).toMatchObject({
      vaultName: 'app',
      environment: 'production',
    });
    const lines = vi.mocked(logInfo).mock.calls.map((c) => c[0]);
    expect(lines[0]).toContain('whole environment');
    expect(lines[1]).toContain('revoked');
    expect(lines[1]).toContain('DB_URL');
    expect(lines[1]).toContain('APP_');
  });

  it('says so when there are none', async () => {
    await setup({ ok: true, json: async () => [] });
    const { logInfo } = await import('lib/log');
    const { listApiKeys } = await import('actions/apiKeys');

    await listApiKeys({ vault: 'app', environment: 'production' });

    expect(vi.mocked(logInfo).mock.calls[0][0]).toContain(
      'No API keys',
    );
  });

  it('fails on an error response', async () => {
    await setup({ ok: false, text: async () => 'nope' });
    const { logError } = await import('lib/log');
    const { exit } = await import('process');
    const { listApiKeys } = await import('actions/apiKeys');

    await listApiKeys({ vault: 'app', environment: 'production' });

    expect(logError).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('prints JSON for scripts', async () => {
    const keys = [
      { name: 'ci', expired: true, revoked: false, claims: {} },
    ];
    await setup({ ok: true, json: async () => keys });
    const write = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const { logInfo } = await import('lib/log');
    const { listApiKeys } = await import('actions/apiKeys');

    await listApiKeys({
      vault: 'app',
      environment: 'production',
      json: true,
    });

    expect(JSON.parse(String(write.mock.calls[0][0]))).toEqual(keys);
    expect(logInfo).not.toHaveBeenCalled();
    write.mockRestore();
  });

  it('marks expired keys', async () => {
    const { formatApiKey } = await import('actions/apiKeys');

    expect(
      formatApiKey({
        name: 'old',
        expired: true,
        revoked: false,
        claims: {},
      }),
    ).toContain('expired');
  });

  it('refuses a vault that is not a cloud vault', async () => {
    await setup({ ok: true, json: async () => [] });
    const { logError } = await import('lib/log');
    const { exit } = await import('process');
    const { listApiKeys } = await import('actions/apiKeys');

    // exit is mocked, so execution runs past it; a real run stops there.
    await listApiKeys({ vault: 'nope', environment: 'production' }).catch(
      () => {},
    );

    expect(vi.mocked(logError).mock.calls[0][0]).toContain(
      'not a cloud vault',
    );
    expect(exit).toHaveBeenCalledWith(1);
  });
});
