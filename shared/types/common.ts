import type { DataConnection } from 'peerjs';
import type Peer from 'peerjs';
import { DropMessageMeta } from './messages';
import { MessageType } from '../lib/constants';

export type BaseContext = {
    id: string | null;
    peer: Peer | null;
    connection: DataConnection | null;
    keyPair: CryptoKeyPair | null;
    nonce: string | null;
    mode: PayloadMode;
    message: string | File | null;
};

export type DropDetails = {
    peerId: string;
    nonce: string;
};

export type InitDropResult = {
    id: string;
    nonce: string;
};

export type PayloadInputMode = 'text' | 'json' | 'file';

export type PayloadMode = 'raw' | 'file';

export type DropPayload =
    | {
          mode: 'raw';
          content: string;
      }
    | {
          mode: 'file';
          content: string;
          type: string;
      };

export type EncryptFile<InputType = string> = (
    key: CryptoKey,
    iv: string,
    pathOrInput: InputType,
) => Promise<string>;

export type DecryptFile<Result = string> = (
    key: CryptoKey,
    iv: string,
    pathOrInput: string,
    meta: DropMessageMeta,
) => Promise<Result>;

export type HashFile<InputType = string> = (
    pathOrInput: InputType,
) => Promise<string>;

export type BaseHandlerInputs<Context, Event> = {
    ctx: Context;
    sendEvent: (event: Event) => unknown;
    logger: {
        info: (message: string) => void;
        error: (message: string) => void;
        debug: (message: string) => void;
    };
    initPeer: () => Promise<Peer>;
    cleanupSession: (ctx: Context) => void;
    apiUri?: string;

    // events
    onRetryExceeded?: (msgType: MessageType) => void;
};
