interface vscode {
  postMessage(message: any): void;
}

declare const tsvscode: vscode;

export function sendMessage(message: Record<string, any>) {
  tsvscode.postMessage(message);
}
