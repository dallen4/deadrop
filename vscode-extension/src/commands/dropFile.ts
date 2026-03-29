import * as vscode from 'vscode';
import { SidebarProvider } from '../SidebarProvider';

export function registerDropFileCommand(
  _context: vscode.ExtensionContext,
  sidebar: SidebarProvider,
): vscode.Disposable {
  return vscode.commands.registerCommand('deadrop.dropFile', () => {
    const editor = vscode.window.activeTextEditor;
    const data = editor?.document.getText() ?? '';
    sidebar.sendMessage({ type: 'startDrop', data, mode: 'file' });
  });
}
