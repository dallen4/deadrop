import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { registerDropCommand } from './commands/drop';
import { registerDropFileCommand } from './commands/dropFile';
import { registerGrabCommand } from './commands/grab';
import { registerLoginCommand } from './commands/login';
import { registerLogoutCommand } from './commands/logout';

export function activate(context: vscode.ExtensionContext) {
  const sidebar = new SidebarProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('deadropSidebar', sidebar),
    registerDropCommand(context, sidebar),
    registerDropFileCommand(context, sidebar),
    registerGrabCommand(context, sidebar),
    registerLoginCommand(context),
    registerLogoutCommand(context),
  );
}

export function deactivate() {}
