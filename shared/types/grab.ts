import type {
    BaseContext,
    BaseHandlerInputs,
    DecryptFile,
    HashFile,
} from './common';
import { GrabEventType } from '../lib/constants';
import type { EventObject } from 'xstate/lib/types';
import type Peer from 'peerjs';

export type GrabContext = BaseContext & {
    grabKey: CryptoKey | null;
    dropperId: string | null;
};

export type GrabEvent<EventType extends GrabEventType> = EventObject & {
    type: EventType;
};

export type AnyGrabEvent = GrabEvent<GrabEventType> & {
    [key: string]: any;
};

export interface InitGrabEvent extends GrabEvent<GrabEventType.Init> {
    id: string;
    dropperId: string;
    peer: Peer;
    keyPair: CryptoKeyPair;
    nonce: string;
}

export interface AckHandshakeEvent extends GrabEvent<GrabEventType.Handshake> {
    grabKey: CryptoKey;
}

export interface ExecuteGrabEvent extends GrabEvent<GrabEventType.Grab> {
    payload: string;
}

export type GrabHandlerInputs<FileType = string> = BaseHandlerInputs<
    GrabContext,
    AnyGrabEvent
> & {
    file: {
        decrypt: DecryptFile<FileType>;
        hash: HashFile<FileType>;
    };
};
