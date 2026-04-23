import * as vscode from 'vscode';
import * as http from 'http';
import { getClerkClient } from '../auth/clerk';

const AUTH_PORT = 1338;

function listenForToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${AUTH_PORT}`);
      const token = url.searchParams.get('token');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<html><body style="font-family:system-ui;padding:40px;text-align:center"><h3>Authenticated!</h3><p>You can close this tab.</p></body></html>',
      );
      server.close();
      if (token) resolve(token);
      else reject(new Error('No token in redirect'));
    });

    server.on('error', reject);
    server.listen(AUTH_PORT);

    setTimeout(() => {
      server.close();
      reject(new Error('Login timed out (2 min)'));
    }, 120_000);
  });
}

export function registerLoginCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand('deadrop.login', async () => {
    const clerk = await getClerkClient();

    if (clerk.session) {
      vscode.window.showInformationMessage(
        'deadrop: already logged in',
      );
      return;
    }

    const appUrl =
      process.env.DEADROP_APP_URL || 'http://localhost:3000';
    const redirectUrl = `http://localhost:${AUTH_PORT}`;
    const loginUrl = `${appUrl}/auth/cli?redirectUrl=${encodeURIComponent(redirectUrl)}`;

    vscode.env.openExternal(vscode.Uri.parse(loginUrl));
    vscode.window.showInformationMessage(
      'deadrop: complete login in your browser',
    );

    try {
      const ticket = await listenForToken();

      const res = await clerk.client?.signIn.create({
        strategy: 'ticket',
        ticket,
      });

      if (res?.status === 'complete') {
        vscode.commands.executeCommand(
          'setContext',
          'deadrop.loggedIn',
          true,
        );
        vscode.window.showInformationMessage(
          'deadrop: logged in successfully',
        );
      } else {
        vscode.window.showErrorMessage(
          'deadrop: login failed — sign-in incomplete',
        );
      }
    } catch (e) {
      vscode.window.showErrorMessage(
        `deadrop: login failed — ${(e as Error).message}`,
      );
    }
  });
}
