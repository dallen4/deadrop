import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "deadrop" is now active!');

  const sidebar = new SidebarProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('deadrop-sidebar', sidebar),
  );

  let dropDisposable = vscode.commands.registerCommand(
    'deadrop.drop',
    async (event) => {
      const selectedText = vscode.window.activeTextEditor?.document.getText(
        vscode.window.activeTextEditor?.selection,
      );
      vscode.window.showInformationMessage(
        `Starting secret drop from editor copy`,
      );

      await sidebar.sendMessage({ data: selectedText, type: 'raw' });
      sidebar._view!.show();
    },
  );

  let dropFileDisposable = vscode.commands.registerCommand(
    'deadrop.dropFile',
    async (event) => {
      const fileName = event.fsPath.substring(
        event.fsPath.lastIndexOf('/') + 1,
      );
      const fileUri = vscode.Uri.parse(event.fsPath);
      const fileContents = await vscode.workspace.fs.readFile(fileUri);

      vscode.window.showInformationMessage(
        `Starting file drop for: ${fileName}`,
      );

      await sidebar.sendMessage({ data: fileContents, type: 'file' });
      sidebar._view!.show();
    },
  );

  let grabDisposable = vscode.commands.registerCommand('deadrop.grab', () => {
    vscode.window.showInformationMessage('Hello World from deadrop!');
  });

  context.subscriptions.push(dropDisposable);
  context.subscriptions.push(dropFileDisposable);
  context.subscriptions.push(grabDisposable);
}

export function deactivate() {}
