import * as vscode from 'vscode';
import { SidebarProvider } from '../SidebarProvider';

export function registerGrabCommand(
  _context: vscode.ExtensionContext,
  sidebar: SidebarProvider,
): vscode.Disposable {
  return vscode.commands.registerCommand('deadrop.grab', async () => {
    const dropId = await vscode.window.showInputBox({
      prompt: 'Enter drop ID',
      placeHolder: 'e.g. abc-def-ghi',
    });
    if (dropId) {
      sidebar.sendMessage({ type: 'startGrab', dropId });
    }
  });
}
