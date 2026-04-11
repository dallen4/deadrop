import * as vscode from 'vscode';
import { VaultPanel } from '../VaultPanel';
import type { SidebarProvider } from '../SidebarProvider';

export function registerOpenVaultCommand(
  context: vscode.ExtensionContext,
  sidebar: SidebarProvider,
): vscode.Disposable {
  return vscode.commands.registerCommand('deadrop.openVault', () => {
    VaultPanel.createOrShow(context.extensionUri, context, () =>
      sidebar.refreshConfig(),
    );
  });
}
