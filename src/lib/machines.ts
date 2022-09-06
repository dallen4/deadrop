import { DropState } from '../constants';
import { assign as baseAssign, createMachine } from 'xstate';
import { DataConnection } from 'peerjs';
import { AnyDropEvent, InitDropEvent } from 'types/events';
import Peer from 'peerjs';

type DropContext = {
    message: string;
    peer: Peer | null;
    connection: DataConnection | null;
    keyPair: CryptoKeyPair | null;
    dropKey: CryptoKey | null;
};

const initDropContext = (): DropContext => ({
    message: '',
    peer: null,
    connection: null,
    keyPair: null,
    dropKey: null,
});

const assign = baseAssign<DropContext>;

export const dropMachine = createMachine<DropContext, AnyDropEvent>(
    {
        id: 'drop',
        preserveActionOrder: true,
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
                    CONNECT: DropState.Connected,
                },
            },
            [DropState.Connected]: {
                entry: (context, event) => {
                    return assign({ connection: event.connection as DataConnection });
                },
                on: {
                    HANDSHAKE: {
                        target: DropState.Acknowledged,
                    },
                },
            },
            // awaiting handshake
            // confirm handshake
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
                    DROP: {
                        target: DropState.Completed,
                    },
                },
            },
            [DropState.Completed]: {
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
            setMessage: (context, event) => {
                assign({ message: event.value });
            },
            dropMessage: (context) => {
                context.connection!.send(context.message);
            },
        },
    },
);
