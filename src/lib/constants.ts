export const NONCE_COOKIE = 'drop-nonce';

export enum ConfirmationEvent {
    KeyReceived = 'PUB_KEY_RECEIVED',
    SecretsReceived = 'SECRETS_RECEIVED',
}

export enum DropState {
    Initial = 'idle',
    Ready = 'ready',
    Waiting = 'waiting',
    Connected = 'connected',
    AwaitingHandshake = 'awaiting::handshake',
    Acknowledged = 'acknowledged',
    AwaitingConfirmation = 'awaiting::confirmation',
    Completed = 'completed',
    Error = 'error',
}

export enum DropEventType {
    Init = 'INITIALIZE',
    Wrap = 'WRAP',
    Connect = 'CONNECT',
    Handshake = 'HANDSHAKE',
    HandshakeComplete = 'HANDSHAKE_COMPLETE',
    Drop = 'DROP',
    Confirm = 'CONFIRM',
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

export const GRAB_PATH = '/grab';

export const DROP_API_PATH = '/api/drop';

export const CAPTCHA_API_PATCH = '/api/captcha';

export enum MessageType {
    Handshake = 'handshake',
    Payload = 'payload',
    Verify = 'verify',
    ConfirmVerification = 'confirm',
}
