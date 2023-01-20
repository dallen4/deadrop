import type { BaseContext } from './common';
import { GrabEventType } from '@shared/lib/constants';
import type { EventObject } from 'xstate/lib/types';
import type Peer from 'peerjs';
import { useGrab } from 'hooks/use-grab';

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

export type GrabContextValues = ReturnType<typeof useGrab>;
