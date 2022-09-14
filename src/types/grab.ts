import type { BaseContext } from './common';
import { GrabEventType } from '@lib/constants';
import type { EventObject } from 'xstate/lib/types';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export type GrabContext = BaseContext & {
    message: Record<string, any> | null;
    grabKey: CryptoKey | null;
};

export type GrabEvent = EventObject & {
    type: GrabEventType;
};

export type AnyGrabEvent = GrabEvent & {
    [key: string]: any;
};

export interface InitGrabEvent extends GrabEvent {
    type: GrabEventType.Init;
    peer: Peer;
    keyPair: CryptoKeyPair;
}

export interface ExecuteGrabEvent extends GrabEvent {
    type: GrabEventType.Grab;
    payload: string;
}
