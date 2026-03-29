import * as vscode from 'vscode';
import { ExtensionConfig, ExtensionMessage, WebviewMessage } from './types';
import { getToken } from './auth/clerk';

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
          case 'ready':
            await this._onWebviewReady();
            break;
          case 'secretReceived':
            vscode.window.showInformationMessage('Secret received!');
            break;
          case 'onInfo':
            vscode.window.showInformationMessage(msg.message);
            break;
          case 'onError':
            vscode.window.showErrorMessage(msg.message);
            break;
        }
      },
    );
  }

  private async _onWebviewReady() {
    const token = await getToken(this._context.secrets);
    const config: ExtensionConfig = {
      apiUrl: process.env.DEADROP_API_URL ?? '',
      peerServerUrl: process.env.PEER_SERVER_URL ?? '',
      turnUsername: process.env.TURN_USERNAME ?? '',
      turnPassword: process.env.TURN_PWD ?? '',
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? '',
      token,
    };
    this.sendMessage({ type: 'init', config });
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

function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
