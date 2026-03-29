export type ExtensionConfig = {
  apiUrl: string;
  peerServerUrl: string;
  turnUsername: string;
  turnPassword: string;
  clerkPublishableKey: string;
  token: string | null;
};

/** Messages sent from webview → extension host */
export type ExtensionMessage =
  | { type: 'ready' }
  | { type: 'secretReceived'; payload: string }
  | { type: 'onInfo'; message: string }
  | { type: 'onError'; message: string };

/** Messages sent from extension host → webview */
export type WebviewMessage =
  | { type: 'init'; config: ExtensionConfig }
  | { type: 'startDrop'; data: string; mode: 'text' | 'file' }
  | { type: 'startGrab'; dropId: string };
