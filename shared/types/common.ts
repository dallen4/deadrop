import type { DataConnection } from 'peerjs';
import type Peer from 'peerjs';
import { DropMessageMeta } from './messages';

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

export type DecryptFile<InputType = string> = (
    key: CryptoKey,
    iv: string,
    pathOrInput: InputType,
    meta: DropMessageMeta,
) => Promise<string>;

export type HashFile<InputType = string> = (
    pathOrInput: InputType,
) => Promise<string>;
