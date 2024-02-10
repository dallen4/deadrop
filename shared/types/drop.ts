import type {
    BaseContext,
    BaseHandlerInputs,
    EncryptFile,
    HashFile,
} from './common';
import type { EventObject } from 'xstate/lib/types';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { DropEventType } from '../lib/constants';

export type DropOptions = {
    decryptedAccess?: 'copy' | 'view' | 'both';

    // premium
    requireMFA?: boolean;
    requireCaptcha?: boolean;
    groupCount?: number;
};

export type DropContext = BaseContext & {
    integrity: string | null;
    dropKey: CryptoKey | null;
};

export type DropEvent<EventType extends DropEventType> = EventObject & {
    type: EventType;
};

export type AnyDropEvent = DropEvent<DropEventType> & {
    [key: string]: any;
};

export interface InitDropEvent extends AnyDropEvent {
    type: DropEventType.Init;
    id: string;
    peer: Peer;
    keyPair: CryptoKeyPair;
    nonce: string;
}

export interface ConnectEvent extends DropEvent<DropEventType.Connect> {
    connection: DataConnection;
}

export interface WrapEvent extends DropEvent<DropEventType.Wrap> {
    payload: Record<string, any>;
    integrity: string;
}

export interface HandshakeEvent extends DropEvent<DropEventType.Handshake> {}

export interface HandshakeCompleteEvent
    extends DropEvent<DropEventType.HandshakeComplete> {
    dropKey: CryptoKey;
}

export interface CompleteEvent extends DropEvent<DropEventType.Confirm> {}

export type DropHandlerInputs<FileType = string> = BaseHandlerInputs<
    DropContext,
    AnyDropEvent
> & {
    file: {
        encrypt: EncryptFile<FileType>;
        hash: HashFile<FileType>;
    };
};
