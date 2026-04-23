import * as vscode from 'vscode';
import {
  ExtensionConfig,
  VaultExtensionMessage,
  VaultExtensionMessageType,
  VaultWebviewMessage,
  VaultWebviewMessageType,
} from './types';
import { getSessionToken, hasCloudAccess } from './auth/clerk';
import { getNonce } from './lib/nonce';
import { loadConfig, saveConfig } from './lib/config';
import {
  openVaultHelpers,
  createVaultDB,
  migrateToCloudSync,
} from './lib/vault';
import { initEnvKey } from '@shared/lib/vault';
import { createClient } from '@shared/client';
import { syncUrl } from '@shared/lib/turso';
import type { VaultDBConfig } from '@shared/types/config';
import type { CreateVaultResponse } from '@shared/types/fetch';

export class VaultPanel {
  public static currentPanel: VaultPanel | undefined;
  private static readonly viewType = 'deadropVault';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext;
  private readonly _disposables: vscode.Disposable[] = [];
  private _activeVault: VaultDBConfig | null = null;
  private _activeVaultName: string | null = null;
  private _onVaultChanged?: () => void;

  public static createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    onVaultChanged?: () => void,
  ) {
    if (VaultPanel.currentPanel) {
      VaultPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      VaultPanel.viewType,
      'deadrop Vault',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'views', 'dist'),
        ],
      },
    );

    VaultPanel.currentPanel = new VaultPanel(
      panel,
      extensionUri,
      context,
      onVaultChanged,
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    onVaultChanged?: () => void,
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._context = context;
    this._onVaultChanged = onVaultChanged;

    this._panel.webview.html = this._getHtmlForWebview(
      this._panel.webview,
    );
    this._panel.onDidDispose(
      () => this.dispose(),
      null,
      this._disposables,
    );

    this._panel.webview.onDidReceiveMessage(
      async (msg: VaultExtensionMessage) => {
        switch (msg.type) {
          case VaultExtensionMessageType.Ready:
            await this._onWebviewReady();
            break;
          case VaultExtensionMessageType.FetchSecret:
            await this._onFetchSecret(msg.name, msg.environment);
            break;
          case VaultExtensionMessageType.AddSecret:
            await this._onAddSecret(
              msg.name,
              msg.value,
              msg.environment,
            );
            break;
          case VaultExtensionMessageType.UpdateSecret:
            await this._onUpdateSecret(
              msg.name,
              msg.value,
              msg.environment,
            );
            break;
          case VaultExtensionMessageType.RenameSecret:
            await this._onRenameSecret(
              msg.oldName,
              msg.newName,
              msg.environment,
            );
            break;
          case VaultExtensionMessageType.CreateVault:
            await this._onCreateVault(msg.name, msg.cloud);
            break;
          case VaultExtensionMessageType.EnableCloudSync:
            await this._onEnableCloudSync();
            break;
          case VaultExtensionMessageType.DisableCloudSync:
            await this._onDisableCloudSync();
            break;
          case VaultExtensionMessageType.CreateEnvironment:
            await this._onCreateEnvironment(msg.name);
            break;
          case VaultExtensionMessageType.DeleteSecret:
            await this._onDeleteSecret(msg.name, msg.environment);
            break;
          case VaultExtensionMessageType.OnInfo:
            vscode.window.showInformationMessage(msg.message);
            break;
          case VaultExtensionMessageType.OnError:
            vscode.window.showErrorMessage(msg.message);
            break;
        }
      },
      null,
      this._disposables,
    );
  }

  private async _onWebviewReady() {
    const [token, canCloudSync] = await Promise.all([
      getSessionToken(),
      hasCloudAccess(),
    ]);
    const deadropConfig = await loadConfig();

    let vaultName: string | null = null;
    let vaultLocation: string | null = null;
    let vaultEnvironmentKeys: Record<string, string> | null = null;

    if (deadropConfig) {
      const { active_vault, vaults } = deadropConfig;
      const activeVault = vaults[active_vault.name];
      if (activeVault) {
        this._activeVault = activeVault;
        this._activeVaultName = active_vault.name;
        vaultName = active_vault.name;
        vaultLocation = activeVault.location;
        vaultEnvironmentKeys = activeVault.environments;
      }
    }

    const config: ExtensionConfig = {
      apiUrl: process.env.DEADROP_API_URL ?? '',
      peerServerUrl: process.env.PEER_SERVER_URL ?? '',
      turnUsername: process.env.TURN_USERNAME ?? '',
      turnPassword: process.env.TURN_PWD ?? '',
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? '',
      token,
      vaultName,
      vaultLocation,
      cloudSync: !!this._activeVault?.cloud,
      canCloudSync,
      vaultEnvironmentKeys,
    };

    this.sendMessage({ type: VaultWebviewMessageType.Init, config });

    if (this._activeVault) {
      console.log(
        '[deadrop] vault location:',
        this._activeVault.location,
      );
      const { run } = openVaultHelpers(this._activeVault);
      const names = await run((h) => h.listSecretNames());
      console.log('[deadrop] secret names:', names);
      this.sendMessage({
        type: VaultWebviewMessageType.SecretNames,
        names,
      });
    }
  }

  private _sendError(operation: string, message: string) {
    vscode.window.showErrorMessage(message);
    this.sendMessage({
      type: VaultWebviewMessageType.OperationError,
      operation,
      message,
    });
  }

  private async _onCreateVault(vaultName: string, cloud?: boolean) {
    const workspaceRoot =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      this._sendError('createVault', 'No workspace folder open.');
      return;
    }
    try {
      const vaultConfig = await createVaultDB(
        vaultName,
        workspaceRoot,
      );

      if (cloud) {
        await this._provisionCloud(vaultName, vaultConfig);
      }

      this._activeVault = vaultConfig;
      this._activeVaultName = vaultName;

      const existingConfig = await loadConfig();
      const vaults = existingConfig?.vaults ?? {};
      vaults[vaultName] = vaultConfig;
      await saveConfig({
        active_vault: { name: vaultName, environment: 'development' },
        vaults,
      });

      const [token, canSync] = await Promise.all([
        getSessionToken(),
        hasCloudAccess(),
      ]);
      this.sendMessage({
        type: VaultWebviewMessageType.Init,
        config: {
          apiUrl: process.env.DEADROP_API_URL ?? '',
          peerServerUrl: process.env.PEER_SERVER_URL ?? '',
          turnUsername: process.env.TURN_USERNAME ?? '',
          turnPassword: process.env.TURN_PWD ?? '',
          clerkPublishableKey:
            process.env.CLERK_PUBLISHABLE_KEY ?? '',
          token,
          vaultName,
          vaultLocation: vaultConfig.location,
          cloudSync: !!vaultConfig.cloud,
          canCloudSync: canSync,
          vaultEnvironmentKeys: vaultConfig.environments,
        },
      });
      this.sendMessage({
        type: VaultWebviewMessageType.SecretNames,
        names: [],
      });
      vscode.window.showInformationMessage(
        `Vault "${vaultName}" created.`,
      );
      this._onVaultChanged?.();
    } catch (e) {
      this._sendError(
        'createVault',
        `Failed to create vault: ${(e as Error).message}`,
      );
    }
  }

  private async _provisionCloud(
    vaultName: string,
    vaultConfig: VaultDBConfig,
    seed?: 'database_upload',
  ): Promise<void> {
    const token = await getSessionToken();
    if (!token) {
      throw new Error('You must be signed in to enable cloud sync.');
    }
    const client = createClient(process.env.DEADROP_API_URL ?? '', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await client.vault.$post({
      json: { name: vaultName, seed },
    });

    const body = await res.json();

    if (res.status !== 201) {
      throw new Error(
        (body as { error?: string }).error ??
          'Cloud provisioning failed.',
      );
    }

    const data = body as CreateVaultResponse;

    vaultConfig.cloud = {
      name: data.name,
      syncUrl: syncUrl(data.hostname),
      authToken: data.token,
    };
  }

  private async _onEnableCloudSync() {
    if (!this._activeVault || !this._activeVaultName) return;
    if (this._activeVault.cloud) return;

    const canSync = await hasCloudAccess();

    if (!canSync) {
      this._sendError(
        'enableCloudSync',
        'Cloud sync requires a premium account.',
      );
      return;
    }

    try {
      // Provision with database_upload seed so we can upload
      // the existing local .db file directly to Turso.
      await this._provisionCloud(
        this._activeVaultName,
        this._activeVault,
        'database_upload',
      );
      const existingConfig = await loadConfig();
      if (existingConfig?.vaults[this._activeVaultName]) {
        existingConfig.vaults[this._activeVaultName].cloud =
          this._activeVault.cloud;
        await saveConfig(existingConfig);
      }

      // Upload the local DB then re-open as an embedded replica.
      await migrateToCloudSync(this._activeVault);
      this.sendMessage({
        type: VaultWebviewMessageType.CloudSyncEnabled,
      });
      this._onVaultChanged?.();
      vscode.window.showInformationMessage('Cloud sync enabled.');
    } catch (e) {
      this._sendError(
        'enableCloudSync',
        `Failed to enable cloud sync: ${(e as Error).message}`,
      );
    }
  }

  private async _onDisableCloudSync() {
    if (!this._activeVault || !this._activeVaultName) return;
    if (!this._activeVault.cloud) return;

    try {
      const token = await getSessionToken();

      if (token) {
        const client = createClient(
          process.env.DEADROP_API_URL ?? '',
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        await client.vault[':name'].$delete({
          param: { name: this._activeVault.cloud.name },
        });
      }

      delete this._activeVault.cloud;

      const existingConfig = await loadConfig();

      if (existingConfig?.vaults[this._activeVaultName]) {
        delete existingConfig.vaults[this._activeVaultName].cloud;
        await saveConfig(existingConfig);
      }

      this.sendMessage({
        type: VaultWebviewMessageType.CloudSyncDisabled,
      });
      this._onVaultChanged?.();
      vscode.window.showInformationMessage('Cloud sync disabled.');
    } catch (e) {
      this._sendError(
        'disableCloudSync',
        `Failed to disable cloud sync: ${(e as Error).message}`,
      );
    }
  }

  private async _onCreateEnvironment(envName: string) {
    if (!this._activeVault || !this._activeVaultName) return;

    const trimmed = envName.trim();

    if (!trimmed) return;

    if (this._activeVault.environments[trimmed]) {
      this._sendError(
        'createEnvironment',
        `Environment "${trimmed}" already exists.`,
      );
      return;
    }

    try {
      const key = await initEnvKey();

      this._activeVault.environments[trimmed] = key;

      const existingConfig = await loadConfig();

      if (existingConfig?.vaults[this._activeVaultName]) {
        existingConfig.vaults[this._activeVaultName].environments[
          trimmed
        ] = key;

        await saveConfig(existingConfig);
      }

      this.sendMessage({
        type: VaultWebviewMessageType.EnvironmentCreated,
        name: trimmed,
        key,
      });
    } catch (e) {
      this._sendError(
        'createEnvironment',
        `Failed to create environment: ${(e as Error).message}`,
      );
    }
  }

  private async _onFetchSecret(name: string, environment: string) {
    if (!this._activeVault) return;
    try {
      const { run } = openVaultHelpers(this._activeVault);

      const encryptedValue = await run((h) =>
        h.getEncryptedSecret(name, environment),
      );

      if (encryptedValue) {
        this.sendMessage({
          type: VaultWebviewMessageType.SecretPayload,
          name,
          environment,
          encryptedValue,
        });
      }
    } catch (e) {
      this._sendError(
        'fetchSecret',
        `Failed to fetch secret: ${(e as Error).message}`,
      );
    }
  }

  private async _onAddSecret(
    name: string,
    value: string,
    environment: string,
  ) {
    if (!this._activeVault) return;
    try {
      const { run } = openVaultHelpers(this._activeVault);

      await run((h) => h.addSecrets([{ name, value, environment }]));

      this.sendMessage({
        type: VaultWebviewMessageType.SecretAdded,
        name,
        environment,
      });
    } catch (e) {
      this._sendError(
        'addSecret',
        `Failed to add secret: ${(e as Error).message}`,
      );
    }
  }

  private async _onUpdateSecret(
    name: string,
    value: string,
    environment: string,
  ) {
    if (!this._activeVault) return;
    try {
      const { run } = openVaultHelpers(this._activeVault);

      await run((h) => h.updateSecret({ name, value, environment }));

      this.sendMessage({
        type: VaultWebviewMessageType.SecretUpdated,
        name,
        environment,
      });
    } catch (e) {
      this._sendError(
        'updateSecret',
        `Failed to update secret: ${(e as Error).message}`,
      );
    }
  }

  private async _onRenameSecret(
    oldName: string,
    newName: string,
    environment: string,
  ) {
    if (!this._activeVault) return;
    try {
      const { run } = openVaultHelpers(this._activeVault);

      await run((h) => h.renameSecret(oldName, newName, environment));

      this.sendMessage({
        type: VaultWebviewMessageType.SecretRenamed,
        oldName,
        newName,
        environment,
      });
    } catch (e) {
      this._sendError(
        'renameSecret',
        `Failed to rename secret: ${(e as Error).message}`,
      );
    }
  }

  private async _onDeleteSecret(name: string, environment: string) {
    if (!this._activeVault) return;
    try {
      const { run } = openVaultHelpers(this._activeVault);

      await run((h) => h.removeSecret(name, environment));

      this.sendMessage({
        type: VaultWebviewMessageType.SecretDeleted,
        name,
        environment,
      });
    } catch (e) {
      this._sendError(
        'deleteSecret',
        `Failed to delete secret: ${(e as Error).message}`,
      );
    }
  }

  sendMessage(msg: VaultWebviewMessage) {
    this._panel.webview.postMessage(msg);
  }

  public dispose() {
    VaultPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      this._disposables.pop()?.dispose();
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const distUri = vscode.Uri.joinPath(
      this._extensionUri,
      'views',
      'dist',
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'assets', 'vault.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'assets', 'index.css'),
    );
    const nonce = getNonce();
    const apiUrl = process.env.DEADROP_API_URL || '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src ${webview.cspSource} ${apiUrl}; img-src ${webview.cspSource} https:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>deadrop Vault</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
