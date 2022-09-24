import type { DataConnection } from 'peerjs';
import type Peer from 'peerjs';

export type BaseContext = {
    id: string | null;
    peer: Peer | null;
    connection: DataConnection | null;
    keyPair: CryptoKeyPair | null;
    nonce: string | null;
};

export type DropDetails = {
    peerId: string;
    nonce: string;
};

export type InitDropResult = {
    id: string;
    nonce: string;
};
