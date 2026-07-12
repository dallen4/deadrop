import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lib/auth/clerk', () => ({
  createClerkClient: vi.fn(),
}));

vi.mock('lib/auth/localhostServer', () => ({
  createLocalAuthServer: vi.fn(),
}));

vi.mock('lib/log', () => ({
  loader: { start: vi.fn(), stop: vi.fn(), text: '' },
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports already-signed-in and never opens the browser', async () => {
    const { createClerkClient } = await import('lib/auth/clerk');
    const { createLocalAuthServer } = await import(
      'lib/auth/localhostServer'
    );
    const { logInfo } = await import('lib/log');
    const open = (await import('open')).default;
    const login = (await import('actions/login')).default;

    vi.mocked(createClerkClient).mockResolvedValue({
      session: { user: { emailAddresses: ['nieky@example.com'] } },
    } as any);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await login();

    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining('already signed in'),
    );
    expect(createLocalAuthServer).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('completes sign-in when the browser hands back a valid ticket', async () => {
    const { createClerkClient } = await import('lib/auth/clerk');
    const { createLocalAuthServer } = await import(
      'lib/auth/localhostServer'
    );
    const { logInfo } = await import('lib/log');
    const login = (await import('actions/login')).default;

    const signInCreate = vi
      .fn()
      .mockResolvedValue({ status: 'complete' });
    vi.mocked(createClerkClient).mockResolvedValue({
      session: null,
      client: { signIn: { create: signInCreate } },
    } as any);
    vi.mocked(createLocalAuthServer).mockResolvedValue({
      listenForAuthRedirect: vi.fn().mockResolvedValue('a-ticket'),
    } as any);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await login();

    expect(signInCreate).toHaveBeenCalledWith({
      strategy: 'ticket',
      ticket: 'a-ticket',
    });
    expect(logInfo).toHaveBeenCalledWith('Successfully logged in!');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('fails when the redirect never produces a token', async () => {
    const { createClerkClient } = await import('lib/auth/clerk');
    const { createLocalAuthServer } = await import(
      'lib/auth/localhostServer'
    );
    const { logError } = await import('lib/log');
    const login = (await import('actions/login')).default;

    vi.mocked(createClerkClient).mockResolvedValue({
      session: null,
      client: { signIn: { create: vi.fn() } },
    } as any);
    vi.mocked(createLocalAuthServer).mockResolvedValue({
      listenForAuthRedirect: vi.fn().mockResolvedValue(null),
    } as any);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await login();

    expect(logError).toHaveBeenCalledWith(
      'Authentication with provided token failed!',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('fails when clerk rejects the ticket', async () => {
    const { createClerkClient } = await import('lib/auth/clerk');
    const { createLocalAuthServer } = await import(
      'lib/auth/localhostServer'
    );
    const { logError } = await import('lib/log');
    const login = (await import('actions/login')).default;

    const signInCreate = vi
      .fn()
      .mockRejectedValue(new Error('This ticket is invalid.'));
    vi.mocked(createClerkClient).mockResolvedValue({
      session: null,
      client: { signIn: { create: signInCreate } },
    } as any);
    vi.mocked(createLocalAuthServer).mockResolvedValue({
      listenForAuthRedirect: vi.fn().mockResolvedValue('a-ticket'),
    } as any);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await login();

    expect(logError).toHaveBeenCalledWith(
      'Authentication with provided token failed!',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
