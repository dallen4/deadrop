import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('../../src/auth/clerk', () => ({
  getClerkClient: vi.fn(),
  getSessionToken: vi.fn().mockResolvedValue('session'),
  hasCloudAccess: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../src/lib/config', () => ({
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
}));
vi.mock('../../src/lib/vault', () => ({
  openVaultHelpers: vi.fn(),
  createVaultDB: vi.fn(),
  attachCloudVault: vi.fn(),
}));
vi.mock('@shared/client', () => ({ createClient: vi.fn() }));
vi.mock('@shared/lib/vault-cloud', () => ({
  connectCloudVault: vi.fn(),
}));
vi.mock('@shared/lib/turso/utils', () => ({
  userOwnsVault: vi.fn(),
}));

import { VaultPanel } from '../../src/VaultPanel';
import { VaultWebviewMessageType } from '../../src/types';
import { getClerkClient } from '../../src/auth/clerk';
import { loadConfig, saveConfig } from '../../src/lib/config';
import { attachCloudVault } from '../../src/lib/vault';
import { createClient } from '@shared/client';
import { connectCloudVault } from '@shared/lib/vault-cloud';
import { userOwnsVault } from '@shared/lib/turso/utils';

const KEEP = 'Turn Off';
const DELETE = 'Turn Off and Delete Cloud Copy';

const cloudVault = () => ({
  location: '/ws/.deadrop/app-cloud.db',
  environments: { development: 'k' },
  cloud: { name: 'a1b2c3d4e5f67-app', authToken: 't' },
});

const panelWith = (vault: ReturnType<typeof cloudVault> | object) => {
  const panel = Object.create(VaultPanel.prototype) as any;
  panel._activeVault = vault;
  panel._activeVaultName = 'app';
  panel.sendMessage = vi.fn();
  return panel;
};

const sent = (panel: any) =>
  panel.sendMessage.mock.calls.map((c: any[]) => c[0].type);

let $delete: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  $delete = vi.fn().mockResolvedValue({ status: 200 });
  vi.mocked(createClient).mockReturnValue({
    vault: { ':name': { $delete } },
  } as any);
  vi.mocked(getClerkClient).mockResolvedValue({
    user: { id: 'user_1' },
  } as any);
  vi.mocked(userOwnsVault).mockResolvedValue(true);
  vi.mocked(loadConfig).mockResolvedValue({
    active_vault: { name: 'app', environment: 'development' },
    vaults: { app: cloudVault() },
  } as any);
});

describe('turning cloud sync off', () => {
  it('keeps the cloud copy by default', async () => {
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(
      KEEP as any,
    );
    const panel = panelWith(cloudVault());

    await panel._onDisableCloudSync();

    expect($delete).not.toHaveBeenCalled();
    expect(panel._activeVault.cloud).toBeUndefined();
    const saved = vi.mocked(saveConfig).mock.calls[0][0];
    expect(saved.vaults.app.cloud).toBeUndefined();
    expect(saved.vaults.app.location).toBe(cloudVault().location);
    expect(sent(panel)).toEqual([
      VaultWebviewMessageType.CloudSyncDisabled,
    ]);
  });

  it('deletes the cloud copy once the name is typed', async () => {
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(
      DELETE as any,
    );
    vi.mocked(vscode.window.showInputBox).mockResolvedValue('app');
    const panel = panelWith(cloudVault());

    await panel._onDisableCloudSync();

    // The worker derives the db name from the caller, so the local name goes out.
    expect($delete).toHaveBeenCalledWith({ param: { name: 'app' } });
    expect(panel._activeVault.cloud).toBeUndefined();
  });

  it('does nothing when the typed name is wrong', async () => {
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(
      DELETE as any,
    );
    vi.mocked(vscode.window.showInputBox).mockResolvedValue(undefined);
    const panel = panelWith(cloudVault());

    await panel._onDisableCloudSync();

    expect($delete).not.toHaveBeenCalled();
    expect(saveConfig).not.toHaveBeenCalled();
    expect(panel._activeVault.cloud).toBeDefined();
    expect(sent(panel)).toEqual([
      VaultWebviewMessageType.CloudSyncUnchanged,
    ]);
  });

  it('does nothing when the dialog is dismissed', async () => {
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(
      undefined,
    );
    const panel = panelWith(cloudVault());

    await panel._onDisableCloudSync();

    expect(saveConfig).not.toHaveBeenCalled();
    expect(sent(panel)).toEqual([
      VaultWebviewMessageType.CloudSyncUnchanged,
    ]);
  });

  it('only offers delete on vaults you own', async () => {
    vi.mocked(userOwnsVault).mockResolvedValue(false);
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(
      KEEP as any,
    );
    const panel = panelWith(cloudVault());

    await panel._onDisableCloudSync();

    const buttons = vi
      .mocked(vscode.window.showWarningMessage)
      .mock.calls[0].slice(2);
    expect(buttons).toEqual([KEEP]);
    expect($delete).not.toHaveBeenCalled();
  });

  it('keeps the cloud config when the delete fails', async () => {
    $delete.mockResolvedValue({
      status: 500,
      text: async () => 'boom',
    });
    vi.mocked(vscode.window.showWarningMessage).mockResolvedValue(
      DELETE as any,
    );
    vi.mocked(vscode.window.showInputBox).mockResolvedValue('app');
    const panel = panelWith(cloudVault());

    await panel._onDisableCloudSync();

    expect(saveConfig).not.toHaveBeenCalled();
    expect(panel._activeVault.cloud).toBeDefined();
    expect(sent(panel)).toEqual([
      VaultWebviewMessageType.OperationError,
    ]);
  });
});

describe('turning cloud sync on', () => {
  it('reattaches and moves the vault to its replica', async () => {
    const cloud = { name: 'a1b2c3d4e5f67-app', authToken: 'fresh' };
    vi.mocked(connectCloudVault).mockResolvedValue(cloud);
    let attached: unknown;
    vi.mocked(attachCloudVault).mockImplementation(async (vault) => {
      attached = structuredClone(vault);
      return '/ws/.deadrop/app-cloud.db';
    });
    vi.mocked(loadConfig).mockResolvedValue({
      active_vault: { name: 'app', environment: 'development' },
      vaults: { app: { location: '/ws/.deadrop/app.db', environments: {} } },
    } as any);
    const panel = panelWith({
      location: '/ws/.deadrop/app.db',
      environments: {},
    });

    await panel._onEnableCloudSync();

    expect(vi.mocked(connectCloudVault).mock.calls[0][1]).toBe('app');
    expect(attached).toMatchObject({
      location: '/ws/.deadrop/app.db',
      cloud,
    });
    const saved = vi.mocked(saveConfig).mock.calls[0][0];
    expect(saved.vaults.app).toMatchObject({
      location: '/ws/.deadrop/app-cloud.db',
      cloud,
    });
    expect(sent(panel)).toEqual([
      VaultWebviewMessageType.CloudSyncEnabled,
    ]);
  });

  it('leaves the vault local when the attach fails', async () => {
    vi.mocked(connectCloudVault).mockResolvedValue({
      name: 'x',
      authToken: 't',
    });
    vi.mocked(attachCloudVault).mockRejectedValue(new Error('nope'));
    const local = { location: '/ws/.deadrop/app.db', environments: {} };
    const panel = panelWith(local);

    await panel._onEnableCloudSync();

    expect(saveConfig).not.toHaveBeenCalled();
    expect(panel._activeVault).toBe(local);
    expect(sent(panel)).toEqual([
      VaultWebviewMessageType.OperationError,
    ]);
  });
});
