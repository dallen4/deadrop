import * as vscode from 'vscode';
import {
  ExtensionConfig,
  ExtensionMessage,
  ExtensionMessageType,
  WebviewMessage,
  WebviewMessageType,
} from './types';
import { getToken } from './auth/clerk';
import { getNonce } from './lib/nonce';
import { loadConfig, saveConfig } from './lib/config';
import { VaultPanel } from './VaultPanel';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    const distUri = vscode.Uri.joinPath(
      this._extensionUri,
      'views',
      'dist',
    );

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [distUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      async (msg: ExtensionMessage) => {
        switch (msg.type) {
          case ExtensionMessageType.Ready:
            await this._onWebviewReady();
            break;
          case ExtensionMessageType.SecretReceived:
            vscode.window.showInformationMessage('Secret received!');
            break;
          case ExtensionMessageType.OnInfo:
            vscode.window.showInformationMessage(msg.message);
            break;
          case ExtensionMessageType.OnError:
            vscode.window.showErrorMessage(msg.message);
            break;
          case ExtensionMessageType.OpenVault:
            vscode.commands.executeCommand('deadrop.openVault');
            break;
          case ExtensionMessageType.SwitchVault:
            await this._onSwitchVault(msg.name);
            break;
        }
      },
    );
  }

  private async _buildConfig(): Promise<ExtensionConfig> {
    const token = await getToken(this._context.secrets);
    const deadropConfig = await loadConfig();
    const vaultName = deadropConfig?.active_vault?.name ?? null;
    const activeVaultConfig = vaultName ? deadropConfig?.vaults[vaultName] : null;
    const vaults = deadropConfig
      ? Object.fromEntries(
          Object.entries(deadropConfig.vaults).map(([n, v]) => [
            n,
            { location: v.location, cloud: !!v.cloud },
          ]),
        )
      : {};
    return {
      apiUrl: process.env.DEADROP_API_URL ?? '',
      peerServerUrl: process.env.PEER_SERVER_URL ?? '',
      turnUsername: process.env.TURN_USERNAME ?? '',
      turnPassword: process.env.TURN_PWD ?? '',
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? '',
      token,
      vaultName,
      vaultLocation: activeVaultConfig?.location ?? null,
      cloudSync: !!activeVaultConfig?.cloud,
      vaultEnvironmentKeys: activeVaultConfig?.environments ?? null,
      vaults,
    };
  }

  private async _onWebviewReady() {
    const config = await this._buildConfig();
    this.sendMessage({ type: WebviewMessageType.Init, config });
  }

  private async _onSwitchVault(name: string) {
    const deadropConfig = await loadConfig();
    if (!deadropConfig?.vaults[name]) return;
    deadropConfig.active_vault.name = name;
    await saveConfig(deadropConfig);
    const config = await this._buildConfig();
    this.sendMessage({ type: WebviewMessageType.Init, config });
    // Dispose existing panel so re-open loads the new active vault
    VaultPanel.currentPanel?.dispose();
    vscode.commands.executeCommand('deadrop.openVault');
  }

  async refreshConfig() {
    const config = await this._buildConfig();
    this.sendMessage({ type: WebviewMessageType.Init, config });
  }

  sendMessage(msg: WebviewMessage) {
    this._view?.webview.postMessage(msg);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const distUri = vscode.Uri.joinPath(
      this._extensionUri,
      'views',
      'dist',
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'assets', 'index.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'assets', 'index.css'),
    );
    const nonce = getNonce();
    const peerHost = new URL(
      process.env.PEER_SERVER_URL || 'wss://0.peerjs.com',
    ).host;
    const apiUrl = process.env.DEADROP_API_URL || '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src ${webview.cspSource} wss://${peerHost} ws://${peerHost} ${apiUrl}; img-src ${webview.cspSource} https:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>deadrop</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
