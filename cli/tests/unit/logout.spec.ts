import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lib/auth/clerk', () => ({
  createClerkClient: vi.fn(),
}));

vi.mock('lib/auth/cache', () => ({
  clearSession: vi.fn(),
}));

vi.mock('lib/log', () => ({
  logInfo: vi.fn(),
}));

describe('logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports not signed in and skips clearSession when there is no session', async () => {
    const { createClerkClient } = await import('lib/auth/clerk');
    const { clearSession } = await import('lib/auth/cache');
    const { logInfo } = await import('lib/log');
    const logout = (await import('actions/logout')).default;

    vi.mocked(createClerkClient).mockResolvedValue({
      session: null,
    } as any);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await logout();

    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining("You're not signed in"),
    );
    expect(clearSession).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('signs out of clerk, clears the stored session, and confirms', async () => {
    const { createClerkClient } = await import('lib/auth/clerk');
    const { clearSession } = await import('lib/auth/cache');
    const { logInfo } = await import('lib/log');
    const logout = (await import('actions/logout')).default;

    const signOut = vi.fn().mockResolvedValue(undefined);
    vi.mocked(createClerkClient).mockResolvedValue({
      session: { id: 'sess_123' },
      signOut,
    } as any);
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await logout();

    expect(signOut).toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith('Successfully signed out!');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});
