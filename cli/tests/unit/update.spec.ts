import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lib/update', () => ({
  updateBinaryInstall: vi.fn(),
  updateNpmInstall: vi.fn(),
  getInstalledDesktopVersion: vi.fn(),
  fetchLatestDesktopRelease: vi.fn(),
  installOrUpdateDesktop: vi.fn(),
  isNewerVersion: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
}));

vi.mock('lib/log', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarning: vi.fn(),
}));

const withPlatform = (platform: string) => {
  vi.stubGlobal('process', { ...process, platform });
};

describe('update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.DEADROP_INSTALL_METHOD;
  });

  it('skips the desktop check entirely with --skip-desktop', async () => {
    withPlatform('darwin');
    const { updateNpmInstall, getInstalledDesktopVersion } = await import(
      'lib/update'
    );
    const update = (await import('actions/update')).default;
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    await update({ skipDesktop: true });

    expect(updateNpmInstall).toHaveBeenCalled();
    expect(getInstalledDesktopVersion).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('checks for desktop updates on non-macOS platforms too', async () => {
    withPlatform('linux');
    const { getInstalledDesktopVersion, fetchLatestDesktopRelease } =
      await import('lib/update');
    const update = (await import('actions/update')).default;
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    vi.mocked(getInstalledDesktopVersion).mockReturnValue(null);

    await update();

    expect(getInstalledDesktopVersion).toHaveBeenCalled();
    expect(fetchLatestDesktopRelease).not.toHaveBeenCalled();
  });

  it('does not prompt when desktop is not installed', async () => {
    withPlatform('darwin');
    const { getInstalledDesktopVersion, fetchLatestDesktopRelease } =
      await import('lib/update');
    const { confirm } = await import('@inquirer/prompts');
    const update = (await import('actions/update')).default;
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    vi.mocked(getInstalledDesktopVersion).mockReturnValue(null);

    await update();

    expect(fetchLatestDesktopRelease).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('prompts and updates when installed and a newer version exists, if confirmed', async () => {
    withPlatform('darwin');
    const {
      getInstalledDesktopVersion,
      fetchLatestDesktopRelease,
      installOrUpdateDesktop,
      isNewerVersion,
    } = await import('lib/update');
    const { confirm } = await import('@inquirer/prompts');
    const update = (await import('actions/update')).default;
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    vi.mocked(getInstalledDesktopVersion).mockReturnValue('0.1.0');
    vi.mocked(fetchLatestDesktopRelease).mockResolvedValue({
      version: '0.2.0',
      assetUrl: 'https://example.com/deadrop.dmg',
      assetSha256Url: 'https://example.com/deadrop.dmg.sha256',
    });
    vi.mocked(isNewerVersion).mockReturnValue(true);
    vi.mocked(confirm).mockResolvedValue(true);

    await update();

    expect(confirm).toHaveBeenCalled();
    expect(installOrUpdateDesktop).toHaveBeenCalled();
  });

  it('does not update when the prompt is declined', async () => {
    withPlatform('darwin');
    const {
      getInstalledDesktopVersion,
      fetchLatestDesktopRelease,
      installOrUpdateDesktop,
      isNewerVersion,
    } = await import('lib/update');
    const { confirm } = await import('@inquirer/prompts');
    const update = (await import('actions/update')).default;
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    vi.mocked(getInstalledDesktopVersion).mockReturnValue('0.1.0');
    vi.mocked(fetchLatestDesktopRelease).mockResolvedValue({
      version: '0.2.0',
      assetUrl: 'https://example.com/deadrop.dmg',
      assetSha256Url: 'https://example.com/deadrop.dmg.sha256',
    });
    vi.mocked(isNewerVersion).mockReturnValue(true);
    vi.mocked(confirm).mockResolvedValue(false);

    await update();

    expect(installOrUpdateDesktop).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
