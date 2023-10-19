import type { BaseContext, DecryptFile, HashFile } from './common';
import { GrabEventType, MessageType } from '../lib/constants';
import type { EventObject } from 'xstate/lib/types';
import type Peer from 'peerjs';

export type GrabContext = BaseContext & {
    grabKey: CryptoKey | null;
    dropperId: string | null;
};

export type GrabEvent = EventObject & {
    type: GrabEventType;
};

export type AnyGrabEvent = GrabEvent & {
    [key: string]: any;
};

export interface InitGrabEvent extends GrabEvent {
    type: GrabEventType.Init;
    id: string;
    dropperId: string;
    peer: Peer;
    keyPair: CryptoKeyPair;
    nonce: string;
}

export interface AckHandshakeEvent extends GrabEvent {
    type: GrabEventType.Handshake;
    grabKey: CryptoKey;
}

export interface ExecuteGrabEvent extends GrabEvent {
    type: GrabEventType.Grab;
    payload: string;
}

export type GrabHandlerInputs = {
    ctx: GrabContext;
    timers: Map<MessageType, NodeJS.Timeout>;
    sendEvent: (event: AnyGrabEvent) => unknown;
    logger: {
        info: (message: string) => void;
        error: (message: string) => void;
        debug: (message: string) => void;
    };
    file: {
        decrypt: DecryptFile;
        hash: HashFile;
    };
    initPeer: () => Promise<Peer>;
    cleanupSession: (ctx: GrabContext) => void;
    apiUri: string;
};
