import type { PayloadMode } from './common';
import { MessageType } from '../lib/constants';

export type BaseMessage = {
  type: MessageType;
  [key: string]: any;
};

export interface HandshakeMessage extends BaseMessage {
  type: MessageType.Handshake;
  input: string;
}

export type DropMessageMeta = { type: string; name: string };

export interface DropMessage extends BaseMessage {
  type: MessageType.Payload;
  mode: PayloadMode;
  payload: string;
  meta?: DropMessageMeta;
}

export interface VerifyMessage extends BaseMessage {
  type: MessageType.Verify;
  integrity: string;
}

export interface ConfirmIntegrityMessage extends BaseMessage {
  type: MessageType.ConfirmVerification;
  verified: boolean;
}

export type MessageHandler = (msg: BaseMessage) => Promise<void>;
