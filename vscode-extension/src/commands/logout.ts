import * as vscode from 'vscode';
import { deleteToken } from '../auth/clerk';

export function registerLogoutCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand('deadrop.logout', async () => {
    await deleteToken(context.secrets);
    vscode.window.showInformationMessage('deadrop: logged out');
  });
}
