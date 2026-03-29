import * as vscode from 'vscode';
import { SidebarProvider } from '../SidebarProvider';

export function registerDropCommand(
  _context: vscode.ExtensionContext,
  sidebar: SidebarProvider,
): vscode.Disposable {
  return vscode.commands.registerCommand('deadrop.drop', () => {
    const editor = vscode.window.activeTextEditor;
    const data = editor?.document.getText(editor.selection) ?? '';
    sidebar.sendMessage({ type: 'startDrop', data, mode: 'text' });
  });
}
