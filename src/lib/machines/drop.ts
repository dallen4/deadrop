import { DropState } from '../constants';
import { assign as baseAssign, createMachine } from 'xstate';
import type { DataConnection } from 'peerjs';
import type { AnyDropEvent, ConnectEvent, InitDropEvent, WrapEvent } from 'types/events';
import Peer from 'peerjs';

type DropContext = {
    id: string | null;
    message: string;
    peer: Peer | null;
    connection: DataConnection | null;
    keyPair: CryptoKeyPair | null;
    dropKey: CryptoKey | null;
    nonce: string | null;
};

const initDropContext = (): DropContext => ({
    id: null,
    message: '',
    peer: null,
    connection: null,
    keyPair: null,
    dropKey: null,
    nonce: null,
});

export const assign = baseAssign<DropContext>;

export const dropMachine = createMachine<DropContext, AnyDropEvent>(
    {
        id: 'drop',
        preserveActionOrder: true,
        predictableActionArguments: true,
        context: initDropContext(),
        initial: DropState.Initial,
        states: {
            [DropState.Initial]: {
                on: {
                    INITIALIZE: {
                        target: DropState.Ready,
                        actions: ['initDrop'],
                    },
                },
            },
            [DropState.Ready]: {
                on: {
                    WRAP: {
                        target: DropState.Waiting,
                        actions: ['setMessage'],
                    },
                },
            },
            [DropState.Waiting]: {
                on: {
                    CONNECT: {
                        target: DropState.Connected,
                        actions: ['setConnection'],
                    },
                },
            },
            [DropState.Connected]: {
                on: {
                    HANDSHAKE: {
                        target: DropState.AwaitingHandshake,
                        actions: ['sendPublicKey'],
                    },
                },
            },
            [DropState.AwaitingHandshake]: {
                on: {
                    CONFIRM: {
                        target: DropState.Acknowledged,
                        actions: ['deriveKey'],
                    },
                },
            },
            [DropState.Acknowledged]: {
                on: {
                    DROP: {
                        target: DropState.AwaitingConfirmation,
                        actions: ['dropMessage'],
                    },
                },
            },
            [DropState.AwaitingConfirmation]: {
                on: {
                    CONFIRM: {
                        target: DropState.Completed,
                        actions: ['verifyIntegrity'],
                    },
                },
            },
            [DropState.Completed]: {
                entry: (context, event) => {
                    return assign(initDropContext());
                },
                type: 'final',
            },
        },
    },
    {
        actions: {
            initDrop: (context, event: InitDropEvent) => {
                // create key pair
                assign({ keyPair: event.keyPair, peer: event.peer });
            },
            setMessage: (context, event: WrapEvent) => {
                assign({ message: event.payload });
            },
            setConnection: (context, event: ConnectEvent) => {
                assign({ connection: event.connection });
            },
            sendPublicKey: () => {},
            deriveKey: () => {},
            dropMessage: (context, event) => {
                context.connection!.send(context.message);
            },
            verifyIntegrity: () => {},
        },
    },
);
