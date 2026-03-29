import * as vscode from 'vscode';
import { storeToken } from '../auth/clerk';

export function registerLoginCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  const uriHandler = vscode.window.registerUriHandler({
    handleUri(uri: vscode.Uri) {
      const params = new URLSearchParams(uri.query);
      const token = params.get('token');
      if (token) {
        storeToken(context.secrets, token).then(() => {
          vscode.window.showInformationMessage(
            'deadrop: logged in successfully',
          );
        });
      }
    },
  });

  context.subscriptions.push(uriHandler);

  return vscode.commands.registerCommand('deadrop.login', () => {
    const apiUrl =
      process.env.DEADROP_API_URL || 'https://deadrop.io';
    vscode.env.openExternal(
      vscode.Uri.parse(`${apiUrl}/auth/vscode`),
    );
  });
}
