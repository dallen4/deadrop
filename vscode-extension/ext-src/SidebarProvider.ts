import * as vscode from 'vscode';

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Listen for messages from the Sidebar component and execute action
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'onPeerInit':
                case 'onInfo': {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case 'onError': {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
            }
        });
    }

    public revive(panel: vscode.WebviewView) {
        this._view = panel;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const peerHost = new URL(process.env.REACT_APP_PEER_SERVER_URL!).host;
        const peerDomain = `ws://${peerHost}`;

        const manifest = require('../build/asset-manifest.json');
        const mainStyle = manifest['files']['main.css'];

        const baseUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'build'),
        );

        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'build', mainStyle),
        );

        const nonce = getNonce();

        const scriptLinks = Object.values<string>(manifest['files'])
            .filter((file: string) => file.endsWith('.js'))
            .map(
                (filePath) =>
                    `<script nonce="${nonce}" src="${webview.asWebviewUri(
                        vscode.Uri.joinPath(
                            this._extensionUri,
                            'build',
                            filePath,
                        ),
                    )}"></script>`,
            );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <!--
                Use a content security policy to only allow loading images from https or from our extension directory,
                and only allow scripts that have a specific nonce.
    -->
    <meta
        http-equiv="Content-Security-Policy"
        content="default-src https://alpha.deadrop.io; connect-src ${webview.cspSource} ${peerDomain} https://alpha.deadrop.io; img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <base href="${baseUri}/">
            <script nonce="${nonce}">
                const tsvscode = acquireVsCodeApi();
            </script>
            
        </head>
        <body>
            <div id="root"></div>
            ${scriptLinks}
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
