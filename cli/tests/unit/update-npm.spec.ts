import { describe, expect, it } from 'vitest';
import {
  detectPackageManager,
  getGlobalInstallCommand,
} from 'lib/update/npm';

describe('detectPackageManager', () => {
  it('detects pnpm from a pnpm global install path', () => {
    expect(
      detectPackageManager(
        '/Users/nieky/Library/pnpm/global/5/.pnpm/deadrop@1.0.0/dist/deadrop.js',
      ),
    ).toBe('pnpm');
  });

  it('detects yarn from a yarn global install path', () => {
    expect(
      detectPackageManager(
        '/Users/nieky/.config/yarn/global/node_modules/deadrop/dist/deadrop.js',
      ),
    ).toBe('yarn');
  });

  it('detects bun from a bun global install path', () => {
    expect(
      detectPackageManager(
        '/Users/nieky/.bun/install/global/node_modules/deadrop/dist/deadrop.js',
      ),
    ).toBe('bun');
  });

  it('defaults to npm when no other package manager marker is present', () => {
    expect(
      detectPackageManager(
        '/usr/local/lib/node_modules/deadrop/dist/deadrop.js',
      ),
    ).toBe('npm');
  });

  it('defaults to npm for an empty path', () => {
    expect(detectPackageManager('')).toBe('npm');
  });
});

describe('getGlobalInstallCommand', () => {
  it('builds the npm global install command', () => {
    expect(getGlobalInstallCommand('npm')).toEqual({
      cmd: 'npm',
      args: ['install', '-g', 'deadrop@latest'],
    });
  });

  it('builds the pnpm global install command', () => {
    expect(getGlobalInstallCommand('pnpm')).toEqual({
      cmd: 'pnpm',
      args: ['add', '-g', 'deadrop@latest'],
    });
  });

  it('builds the yarn global install command', () => {
    expect(getGlobalInstallCommand('yarn')).toEqual({
      cmd: 'yarn',
      args: ['global', 'add', 'deadrop@latest'],
    });
  });

  it('builds the bun global install command', () => {
    expect(getGlobalInstallCommand('bun')).toEqual({
      cmd: 'bun',
      args: ['add', '-g', 'deadrop@latest'],
    });
  });
});
