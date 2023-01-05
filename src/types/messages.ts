import { MessageType } from '~lib/constants';
import { PayloadMode } from './common';

export type BaseMessage = {
    type: MessageType;
    [key: string]: any;
};

export interface HandshakeMessage extends BaseMessage {
    type: MessageType.Handshake;
    input: string;
}

export interface DropMessage extends BaseMessage {
    type: MessageType.Payload;
    mode: PayloadMode;
    payload: string;
    meta?: { type: string; name: string; };
}

export interface VerifyMessage extends BaseMessage {
    type: MessageType.Verify;
    integrity: string;
}

export interface ConfirmIntegrityMessage extends BaseMessage {
    type: MessageType.ConfirmVerification;
    verified: boolean;
}
