import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lib/auth/clerk', () => ({
  createClerkClient: vi.fn(),
}));

vi.mock('lib/log', () => ({
  logInfo: vi.fn(),
}));

describe('whoami', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports signed-out when there is no session', async () => {
    const { createClerkClient } = await import('lib/auth/clerk');
    const { logInfo } = await import('lib/log');
    const whoami = (await import('actions/whoami')).default;

    vi.mocked(createClerkClient).mockResolvedValue({
      session: null,
    } as any);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await whoami();

    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining("You're not signed in"),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('prints the signed-in email when there is a session', async () => {
    const { createClerkClient } = await import('lib/auth/clerk');
    const { logInfo } = await import('lib/log');
    const whoami = (await import('actions/whoami')).default;

    vi.mocked(createClerkClient).mockResolvedValue({
      session: {
        user: { emailAddresses: ['nieky@example.com'] },
      },
    } as any);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await whoami();

    expect(logInfo).toHaveBeenCalledWith(
      'Signed in as nieky@example.com',
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});
