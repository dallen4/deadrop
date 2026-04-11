import * as vscode from 'vscode';
import { MAX_PAYLOAD_SIZE, ACCEPTED_FILE_TYPES } from '@shared/config/files';
import type { SidebarProvider } from '../SidebarProvider';
import { DropMode, WebviewMessageType } from '../types';

export function registerDropExplorerFileCommand(
  _context: vscode.ExtensionContext,
  sidebar: SidebarProvider,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'deadrop.dropExplorerFile',
    async (uri: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage('deadrop: No file selected.');
        return;
      }

      const ext = uri.path.slice(uri.path.lastIndexOf('.'));
      if (!ACCEPTED_FILE_TYPES.includes(ext)) {
        vscode.window.showErrorMessage(
          `deadrop: Unsupported file type "${ext}". Accepted: ${ACCEPTED_FILE_TYPES.join(', ')}`,
        );
        return;
      }

      const fileBytes = await vscode.workspace.fs.readFile(uri);

      if (fileBytes.byteLength > MAX_PAYLOAD_SIZE) {
        vscode.window.showErrorMessage(
          `deadrop: File too large (${Math.ceil(fileBytes.byteLength / 1024)} KB). ` +
            `Maximum payload size is ${MAX_PAYLOAD_SIZE / 1000} KB.`,
        );
        return;
      }

      const data = new TextDecoder().decode(fileBytes);

      await vscode.commands.executeCommand(
        'workbench.view.extension.deadrop',
      );

      sidebar.sendMessage({
        type: WebviewMessageType.StartDrop,
        data,
        mode: DropMode.File,
      });
    },
  );
}
