import type { BaseContext } from './common';
import type { EventObject } from 'xstate/lib/types';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { DropEventType } from '@shared/lib/constants';
import { useDrop } from 'hooks/use-drop';

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

export type DropEvent = EventObject & {
    type: DropEventType;
};

export type AnyDropEvent = DropEvent & {
    [key: string]: any;
};

export interface InitDropEvent extends AnyDropEvent {
    type: DropEventType.Init;
    id: string;
    peer: Peer;
    keyPair: CryptoKeyPair;
    nonce: string;
}

export interface ConnectEvent extends DropEvent {
    type: DropEventType.Connect;
    connection: DataConnection;
}

export interface WrapEvent extends DropEvent {
    type: DropEventType.Wrap;
    payload: Record<string, any>;
    integrity: string;
}

export interface HandshakeEvent extends DropEvent {
    type: DropEventType.Handshake;
}

export interface HandshakeCompleteEvent extends DropEvent {
    type: DropEventType.HandshakeComplete;
    dropKey: CryptoKey;
}

export interface CompleteEvent extends DropEvent {
    type: DropEventType.Confirm;
}

export type DropContextValues = ReturnType<typeof useDrop>;
