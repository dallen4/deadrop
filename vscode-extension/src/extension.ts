import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { VaultPanel } from './VaultPanel';
import { registerDropCommand } from './commands/drop';
import { registerDropFileCommand } from './commands/dropFile';
import { registerDropExplorerFileCommand } from './commands/dropExplorerFile';
import { registerGrabCommand } from './commands/grab';
import { registerLoginCommand } from './commands/login';
import { registerLogoutCommand } from './commands/logout';
import { registerOpenVaultCommand } from './commands/openVault';
import { getSessionToken } from './auth/clerk';

export async function activate(context: vscode.ExtensionContext) {
  const sidebar = new SidebarProvider(context.extensionUri, context);

  const token = await getSessionToken();
  vscode.commands.executeCommand(
    'setContext',
    'deadrop.loggedIn',
    !!token,
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('deadropSidebar', sidebar),
    registerDropCommand(context, sidebar),
    registerDropFileCommand(context, sidebar),
    registerDropExplorerFileCommand(context, sidebar),
    registerGrabCommand(context, sidebar),
    registerLoginCommand(context),
    registerLogoutCommand(context),
    registerOpenVaultCommand(context, sidebar),
  );
}

export function deactivate() {
  VaultPanel.currentPanel?.dispose();
}
