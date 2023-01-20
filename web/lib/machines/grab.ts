import type { AnyGrabEvent, GrabContext } from 'types/grab';
import { GrabEventType, GrabState } from '@shared/lib/constants';
import { createMachine, TransitionsConfig } from 'xstate';
import { raise as baseRaise } from 'xstate/lib/actions';

export const initGrabContext = (): GrabContext => ({
    id: null,
    mode: 'raw',
    message: null,
    dropperId: null,
    peer: null,
    connection: null,
    keyPair: null,
    grabKey: null,
    nonce: null,
});

export const raise = baseRaise<Record<string, never>, AnyGrabEvent>;

export const grabMachine = createMachine<Record<string, never>, AnyGrabEvent>({
    id: 'grab',
    preserveActionOrder: true,
    predictableActionArguments: true,
    initial: GrabState.Initial,
    states: {
        [GrabState.Initial]: {
            on: {
                INITIALIZE: {
                    target: GrabState.Ready,
                    actions: [raise(GrabEventType.Connect)],
                },
            } as TransitionsConfig<Record<string, never>, AnyGrabEvent>,
        },
        [GrabState.Ready]: {
            on: {
                CONNECT: {
                    target: GrabState.Connected,
                },
            },
        },
        [GrabState.Connected]: {
            on: {
                HANDSHAKE: {
                    target: GrabState.Waiting,
                },
            },
        },
        [GrabState.Waiting]: {
            on: {
                GRAB: {
                    target: GrabState.Received,
                    actions: [raise(GrabEventType.Verify)],
                },
            } as TransitionsConfig<Record<string, never>, AnyGrabEvent>,
        },
        [GrabState.Received]: {
            on: {
                VERIFY: {
                    target: GrabState.Confirmed,
                },
            },
        },
        [GrabState.AwaitingConfirmation]: {
            on: {
                CONFIRM: {
                    target: GrabState.Confirmed,
                },
                FAILURE: {
                    target: GrabState.Error,
                },
            },
        },
        [GrabState.Confirmed]: {
            on: {
                CLEANUP: {
                    target: GrabState.Completed,
                },
            },
        },
        [GrabState.Error]: {},
        [GrabState.Completed]: {
            type: 'final',
        },
    },
});
