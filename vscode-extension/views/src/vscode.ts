import type {
  ExtensionMessage,
  VaultExtensionMessage,
  VaultWebviewMessage,
  WebviewMessage,
} from '../../src/types';

type AnyOutMessage = ExtensionMessage | VaultExtensionMessage;
type AnyInMessage = WebviewMessage | VaultWebviewMessage;

declare function acquireVsCodeApi(): {
  postMessage(msg: AnyOutMessage): void;
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

export function postMessage(msg: AnyOutMessage) {
  getApi()?.postMessage(msg);
}

export function onMessage(
  handler: (msg: AnyInMessage) => void,
): () => void {
  const listener = (event: MessageEvent) =>
    handler(event.data as AnyInMessage);
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
