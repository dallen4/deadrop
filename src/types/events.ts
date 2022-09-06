import { DropEventType } from '../constants';
import { EventObject } from 'xstate/lib/types';
import Peer from 'peerjs';

export type DropEvent = EventObject & {
    type: DropEventType;
};

export type AnyDropEvent = DropEvent & {
    [key: string]: any;
};

export interface InitDropEvent extends DropEvent {
    type: DropEventType.Init;
    peer: Peer;
    keyPair: CryptoKeyPair;
}
