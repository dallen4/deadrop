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

export const DEFAULT_VAULT_NAME = 'default.db';

export const SECRET_VALUE_DELIMITER = ' | ';

// Shared secret header for first-party service-to-service calls
// (e.g. web billing webhooks → Worker vault lock/unlock)
export const SERVICE_TOKEN_HEADER = 'x-deadrop-service-token';
