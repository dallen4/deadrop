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

export enum GrabberStatus {
  Connected = 'connected', // DataConnection open, pre-handshake
  Transferring = 'transferring', // key exchanged, payload sent, awaiting verify
  Confirmed = 'confirmed', // integrity verified + confirm sent (terminal success)
  Failed = 'failed', // connection error / integrity mismatch (terminal)
}

export type GrabberRecord = {
  peerId: string; // grabber's PeerJS id (map key)
  connection: DataConnection; // this grabber's channel
  dropKey: CryptoKey | null; // per-grabber ECDH-derived key (null until handshake)
  status: GrabberStatus;
  connectedAt: number; // Date.now()
  confirmedAt: number | null;
};

export type DropContext = BaseContext & {
  integrity: string | null; // single payload hash (unchanged)
  keyPair: CryptoKeyPair | null; // dropper's single keypair (unchanged)
  grabbers: Map<string, GrabberRecord>; // keyed by grabber peerId
  maxGrabbers: number | null; // null = unbounded
  accepting: boolean; // false after stop / cap reached
};

export type DropEvent<EventType extends DropEventType> =
  EventObject & {
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
  maxGrabbers: number | null;
}

export interface WrapEvent extends DropEvent<DropEventType.Wrap> {
  integrity: string;
}

export interface ReadyEvent
  extends DropEvent<DropEventType.Ready> {}

export interface GrabberConnectedEvent
  extends DropEvent<DropEventType.GrabberConnected> {
  grabberId: string;
  connection: DataConnection;
}

export interface GrabberProgressEvent
  extends DropEvent<DropEventType.GrabberProgress> {
  grabberId: string;
  status: GrabberStatus;
}

export interface GrabberConfirmedEvent
  extends DropEvent<DropEventType.GrabberConfirmed> {
  grabberId: string;
}

export interface GrabberFailedEvent
  extends DropEvent<DropEventType.GrabberFailed> {
  grabberId: string;
}

export interface StopAcceptingEvent
  extends DropEvent<DropEventType.StopAccepting> {}

export type DropHandlerInputs<FileType = string> = BaseHandlerInputs<
  DropContext,
  AnyDropEvent
> & {
  file: {
    encrypt: EncryptFile<FileType>;
    hash: HashFile<FileType>;
  };
};
