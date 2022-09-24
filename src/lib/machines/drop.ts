import { DropState } from '../constants';
import { assign as baseAssign, createMachine } from 'xstate';
import type { AnyDropEvent, ConnectEvent, InitDropEvent, WrapEvent } from 'types/drop';
import type { DropContext } from 'types/drop';

const initDropContext = (): DropContext => ({
    id: null,
    message: {},
    integrity: null,
    peer: null,
    connection: null,
    keyPair: null,
    dropKey: null,
    nonce: null,
});

export const assign = baseAssign<DropContext>;

export const dropMachine = createMachine<
    DropContext,
    AnyDropEvent,
    { value: DropState; context: DropContext }
>(
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
                    HANDSHAKE_COMPLETE: {
                        target: DropState.Acknowledged,
                        actions: ['setDropKey'],
                    },
                },
            },
            [DropState.Acknowledged]: {
                on: {
                    DROP: {
                        target: DropState.AwaitingConfirmation,
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
            [DropState.Error]: {},
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
            initDrop: (context, event: InitDropEvent) => {},
            setMessage: (context, event: WrapEvent) => {},
            setConnection: (context, event: ConnectEvent) => {},
            sendPublicKey: () => {},
            setDropKey: () => {},
            verifyIntegrity: () => {},
        },
    },
);
