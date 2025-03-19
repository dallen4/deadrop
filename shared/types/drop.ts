import type {
  BaseContext,
  BaseHandlerInputs,
  EncryptFile,
  HashFile,
} from './common';
import type { EventObject } from 'xstate/lib/types';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { ActorRef } from 'xstate';
import { DropEventType } from '../lib/constants';

// Main drop context with all state
export type DropContext = BaseContext & {
  // Actor management
  drops: Map<string, ActorRef<{ type: DropEventType }>>;

  // Connection tracking
  connections: Map<string, DataConnection>;
  activeSessions: number;
  maxSessions: number;
  completedSessions: number;

  // Drop state
  integrity: string | null;
  dropKey: CryptoKey | null;
};

// Connection machine is stateless
export type ConnectionContext = {};

export type DropOptions = {
  decryptedAccess?: 'copy' | 'view' | 'both';
  requireMFA?: boolean;
  requireCaptcha?: boolean;
  maxSessions?: number;
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
}

export interface ConnectEvent
  extends DropEvent<DropEventType.Connect> {
  connection: DataConnection;
}

export interface WrapEvent extends DropEvent<DropEventType.Wrap> {
  payload: string | File;
  integrity: string;
}

export interface HandshakeEvent
  extends DropEvent<DropEventType.Handshake> {}

export interface HandshakeCompleteEvent
  extends DropEvent<DropEventType.HandshakeComplete> {
  dropKey: CryptoKey;
}

export interface CompleteEvent
  extends DropEvent<DropEventType.Confirm> {}

export type DropHandlerInputs<FileType = string> = BaseHandlerInputs<
  DropContext,
  AnyDropEvent
> & {
  file: {
    encrypt: EncryptFile<FileType>;
    hash: HashFile<FileType>;
  };
};
