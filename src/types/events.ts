import { DropEventType, GrabEventType } from '@lib/constants';
import { EventObject } from 'xstate/lib/types';
import Peer from 'peerjs';
import { DataConnection } from 'peerjs';

export type DropEvent = EventObject & {
    type: DropEventType;
};

export type GrabEvent = EventObject & {
    type: GrabEventType;
};

export type AnyDropEvent = DropEvent & {
    [key: string]: any;
};

export type AnyGrabEvent = GrabEvent & {
    [key: string]: any;
};

export interface InitDropEvent extends DropEvent {
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

export interface InitGrabEvent extends GrabEvent {
    type: GrabEventType.Init;
    peer: Peer;
    keyPair: CryptoKeyPair;
}

export interface ExecuteGrabEvent extends GrabEvent {
    type: GrabEventType.Grab;
    payload: string;
}

