import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "deadrop" is now active!');

    const sidebar = new SidebarProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('deadrop-sidebar', sidebar),
    );

    let dropDisposable = vscode.commands.registerCommand('deadrop.drop', () => {
        vscode.window.showInformationMessage('Hello World from deadrop!');
    });

    context.subscriptions.push(dropDisposable);
}

export function deactivate() {}
