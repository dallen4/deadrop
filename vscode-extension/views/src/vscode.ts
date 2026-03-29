import type { ExtensionMessage, WebviewMessage } from '../../src/types';

declare function acquireVsCodeApi(): {
  postMessage(msg: ExtensionMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
};

let _vscode: ReturnType<typeof acquireVsCodeApi> | undefined;

function getApi() {
  if (!_vscode && typeof acquireVsCodeApi !== 'undefined') {
    _vscode = acquireVsCodeApi();
  }
  return _vscode;
}

export function postMessage(msg: ExtensionMessage) {
  getApi()?.postMessage(msg);
}

export function onMessage(
  handler: (msg: WebviewMessage) => void,
): () => void {
  const listener = (event: MessageEvent) =>
    handler(event.data as WebviewMessage);
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
