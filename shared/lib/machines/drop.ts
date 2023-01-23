import type { AnyDropEvent, DropContext } from '../../types/drop';
import { DropEventType, DropState } from '../constants';
import { createMachine, TransitionsConfig } from 'xstate';
import { raise as baseRaise } from 'xstate/lib/actions';

export const initDropContext = (): DropContext => ({
    id: null,
    mode: 'raw',
    message: {},
    integrity: null,
    peer: null,
    connection: null,
    keyPair: null,
    dropKey: null,
    nonce: null,
});

export const raise = baseRaise<Record<string, never>, AnyDropEvent>;

export const dropMachine = createMachine<
    Record<string, never>,
    AnyDropEvent,
    { value: DropState; context: Record<string, never> }
>({
    id: 'drop',
    preserveActionOrder: true,
    predictableActionArguments: true,
    initial: DropState.Initial,
    states: {
        [DropState.Initial]: {
            on: {
                INITIALIZE: {
                    target: DropState.Ready,
                },
            },
        },
        [DropState.Ready]: {
            on: {
                WRAP: {
                    target: DropState.Waiting,
                },
            },
        },
        [DropState.Waiting]: {
            on: {
                CONNECT: {
                    target: DropState.Connected,
                    actions: [raise(DropEventType.Handshake)],
                },
            } as TransitionsConfig<Record<string, never>, AnyDropEvent>,
        },
        [DropState.Connected]: {
            on: {
                HANDSHAKE: {
                    target: DropState.AwaitingHandshake,
                },
            },
        },
        [DropState.AwaitingHandshake]: {
            on: {
                HANDSHAKE_COMPLETE: {
                    target: DropState.Acknowledged,
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
                },
            },
        },
        [DropState.Error]: {},
        [DropState.Completed]: {
            type: 'final',
        },
    },
});
