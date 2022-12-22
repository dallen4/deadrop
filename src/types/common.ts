import type { DataConnection } from 'peerjs';
import type Peer from 'peerjs';

export type BaseContext = {
    id: string | null;
    peer: Peer | null;
    connection: DataConnection | null;
    keyPair: CryptoKeyPair | null;
    nonce: string | null;
    mode: PayloadMode;
    message: Record<string, any> | File | null;
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
