export type VaultSummary = {
  location: string;
  cloud: boolean;
};

export type ExtensionConfig = {
  apiUrl: string;
  peerServerUrl: string;
  turnUsername: string;
  turnPassword: string;
  clerkPublishableKey: string;
  token: string | null;
  vaultName?: string | null;
  /** Location (path) of the active vault DB file. */
  vaultLocation?: string | null;
  /** Whether the active vault has cloud sync enabled. */
  cloudSync?: boolean;
  /** Per-environment encryption keys (base64). Only present when a vault is connected. */
  vaultEnvironmentKeys?: Record<string, string> | null;
  /** All known vaults: name → summary (location + cloud status). */
  vaults?: Record<string, VaultSummary>;
};

export enum DropMode {
  Text = 'text',
  File = 'file',
}

/** Discriminants for messages sent from webview → extension host (sidebar) */
export enum ExtensionMessageType {
  Ready = 'ready',
  SecretReceived = 'secretReceived',
  OnInfo = 'onInfo',
  OnError = 'onError',
  OpenVault = 'openVault',
  SwitchVault = 'switchVault',
}

/** Discriminants for messages sent from extension host → webview (sidebar) */
export enum WebviewMessageType {
  Init = 'init',
  StartDrop = 'startDrop',
  StartGrab = 'startGrab',
}

/** Discriminants for messages sent from vault webview → extension host */
export enum VaultExtensionMessageType {
  Ready = 'ready',
  CreateVault = 'createVault',
  CreateEnvironment = 'createEnvironment',
  EnableCloudSync = 'enableCloudSync',
  DisableCloudSync = 'disableCloudSync',
  FetchSecret = 'fetchSecret',
  AddSecret = 'addSecret',
  UpdateSecret = 'updateSecret',
  RenameSecret = 'renameSecret',
  DeleteSecret = 'deleteSecret',
  OnInfo = 'onInfo',
  OnError = 'onError',
}

/** Discriminants for messages sent from extension host → vault webview */
export enum VaultWebviewMessageType {
  Init = 'init',
  SecretNames = 'secretNames',
  SecretPayload = 'secretPayload',
  SecretAdded = 'secretAdded',
  SecretUpdated = 'secretUpdated',
  SecretRenamed = 'secretRenamed',
  SecretDeleted = 'secretDeleted',
  EnvironmentCreated = 'environmentCreated',
  CloudSyncEnabled = 'cloudSyncEnabled',
  CloudSyncDisabled = 'cloudSyncDisabled',
}

/** Messages sent from webview → extension host (sidebar) */
export type ExtensionMessage =
  | { type: ExtensionMessageType.Ready }
  | { type: ExtensionMessageType.SecretReceived; payload: string }
  | { type: ExtensionMessageType.OnInfo; message: string }
  | { type: ExtensionMessageType.OnError; message: string }
  | { type: ExtensionMessageType.OpenVault }
  | { type: ExtensionMessageType.SwitchVault; name: string };

/** Messages sent from extension host → webview (sidebar) */
export type WebviewMessage =
  | { type: WebviewMessageType.Init; config: ExtensionConfig }
  | { type: WebviewMessageType.StartDrop; data: string; mode: DropMode }
  | { type: WebviewMessageType.StartGrab; dropId: string };

/** Messages sent from vault webview → extension host */
export type VaultExtensionMessage =
  | { type: VaultExtensionMessageType.Ready }
  | { type: VaultExtensionMessageType.CreateVault; name: string; cloud?: boolean }
  | { type: VaultExtensionMessageType.CreateEnvironment; name: string }
  | { type: VaultExtensionMessageType.EnableCloudSync }
  | { type: VaultExtensionMessageType.DisableCloudSync }
  | { type: VaultExtensionMessageType.FetchSecret; name: string; environment: string }
  | { type: VaultExtensionMessageType.AddSecret; name: string; value: string; environment: string }
  | { type: VaultExtensionMessageType.UpdateSecret; name: string; value: string; environment: string }
  | { type: VaultExtensionMessageType.RenameSecret; oldName: string; newName: string; environment: string }
  | { type: VaultExtensionMessageType.DeleteSecret; name: string; environment: string }
  | { type: VaultExtensionMessageType.OnInfo; message: string }
  | { type: VaultExtensionMessageType.OnError; message: string };

/** Messages sent from extension host → vault webview */
export type VaultWebviewMessage =
  | { type: VaultWebviewMessageType.Init; config: ExtensionConfig }
  | { type: VaultWebviewMessageType.SecretNames; names: { name: string; environment: string }[] }
  | { type: VaultWebviewMessageType.SecretPayload; name: string; environment: string; encryptedValue: string }
  | { type: VaultWebviewMessageType.SecretAdded; name: string; environment: string }
  | { type: VaultWebviewMessageType.SecretUpdated; name: string; environment: string }
  | { type: VaultWebviewMessageType.SecretRenamed; oldName: string; newName: string; environment: string }
  | { type: VaultWebviewMessageType.SecretDeleted; name: string; environment: string }
  | { type: VaultWebviewMessageType.EnvironmentCreated; name: string; key: string }
  | { type: VaultWebviewMessageType.CloudSyncEnabled }
  | { type: VaultWebviewMessageType.CloudSyncDisabled };
