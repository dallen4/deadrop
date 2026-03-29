import * as vscode from 'vscode';

const SECRET_KEY = 'deadrop-clerk-token';

export async function getToken(
  secrets: vscode.SecretStorage,
): Promise<string | null> {
  return (await secrets.get(SECRET_KEY)) ?? null;
}

export async function storeToken(
  secrets: vscode.SecretStorage,
  token: string,
): Promise<void> {
  await secrets.store(SECRET_KEY, token);
}

export async function deleteToken(
  secrets: vscode.SecretStorage,
): Promise<void> {
  await secrets.delete(SECRET_KEY);
}
