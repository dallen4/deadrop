export enum ConfirmationEvent {
  KeyReceived = 'PUB_KEY_RECEIVED',
  SecretsReceived = 'SECRETS_RECEIVED',
}

export enum DropState {
  Initial = 'initial',
  Ready = 'ready',
  Accepting = 'accepting', // stable; grabbers come and go here
  Completed = 'completed',
  Error = 'error',
}

export enum DropEventType {
  Init = 'INITIALIZE',
  Wrap = 'WRAP',
  Ready = 'READY',
  GrabberConnected = 'GRABBER_CONNECTED', // { grabberId }
  GrabberProgress = 'GRABBER_PROGRESS', // { grabberId, status }
  GrabberConfirmed = 'GRABBER_CONFIRMED', // { grabberId }
  GrabberFailed = 'GRABBER_FAILED', // { grabberId }
  StopAccepting = 'STOP_ACCEPTING',
}

export enum GrabState {
  Initial = 'idle',
  Ready = 'ready',
  Connected = 'connected',
  Waiting = 'waiting',
  Received = 'received',
  AwaitingConfirmation = 'awaiting::confirmation',
  Confirmed = 'confirmed',
  Completed = 'completed',
  Error = 'error',
}

export enum GrabEventType {
  Init = 'INITIALIZE',
  Connect = 'CONNECT',
  Handshake = 'HANDSHAKE',
  Grab = 'GRAB',
  Verify = 'VERIFY',
  Confirm = 'CONFIRM',
  Failure = 'FAILURE',
  Cleanup = 'CLEANUP',
}

export enum MessageType {
  Handshake = 'handshake',
  Payload = 'payload',
  Verify = 'verify',
  ConfirmVerification = 'confirm',
}

export const DropMessageOrderMap = new Map([
  [MessageType.Handshake, MessageType.Handshake],
  [MessageType.Payload, MessageType.Verify],
]);

export const GrabMessageOrderMap = new Map([
  [MessageType.Handshake, MessageType.Payload],
  [MessageType.Verify, MessageType.ConfirmVerification],
]);

export const CONFIG_FILE_NAME = '.deadroprc';

export const STORAGE_DIR_NAME = '.deadrop';

// Must match `identifier` in desktop/src-tauri/tauri.conf.json — used by
// the CLI to compute the same OS app-data directory Tauri's
// app_data_dir() resolves to, so both share one global default config.
export const APP_IDENTIFIER = 'com.deadrop';

export const DEFAULT_VAULT_NAME = 'default.db';

// Turso organization slug backing every cloud vault. Part of every vault
// hostname (`libsql://<db>-<org>.turso.io`), so all four surfaces derive
// sync URLs from it rather than storing one. Changing it means migrating
// every database, so it is a code change, not configuration.
export const TURSO_ORGANIZATION = 'dallen4';

export const SECRET_VALUE_DELIMITER = ' | ';

// Vault shares ride the existing `raw` payload mode and discriminate on
// `DropMessageMeta.type`, so a grabber that doesn't recognize it still
// renders readable YAML instead of hitting an unhandled mode.
export const VAULT_PAYLOAD_TYPE = 'application/vnd.deadrop.vault';

// Shared secret header for first-party service-to-service calls
// (e.g. web billing webhooks → Worker vault lock/unlock)
export const SERVICE_TOKEN_HEADER = 'x-deadrop-service-token';
