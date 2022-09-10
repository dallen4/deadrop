
export const NONCE_COOKIE = 'nonce';

export enum ConfirmationEvent {
    KeyReceived = 'PUB_KEY_RECEIVED',
    SecretsReceived = 'SECRETS_RECEIVED',
};

export enum DropState {
    Initial = 'idle',
    Ready = 'ready',
    Waiting = 'waiting',
    Connected = 'connected',
    AwaitingHandshake = 'awaiting::handshake',
    Acknowledged = 'acknowledged',
    AwaitingConfirmation = 'awaiting::confirmation',
    Completed = 'completed',
};

export enum DropEventType {
    Init = 'INITIALIZE',
    Wrap = 'WRAP',
    Connect = 'CONNECT',
    Handshake = 'HANDSHAKE',
    Drop = 'DROP',
    Confirm = 'CONFIRM',
};

export enum GrabState {
    Initial = 'idle',
    Ready = 'ready',
    Connected = 'connected',
    Waiting = 'waiting',
    Received = 'received',
    Confirmed = 'confirmed',
    Completed = 'completed',
};

export enum GrabEventType {
    Init = 'INITIALIZE',
    Connect = 'CONNECT',
    Handshake = 'HANDSHAKE',
    Grab = 'GRAB',
    Unwrap = 'UNWRAP',
    Cleanup = 'CLEANUP',
}
