import { GrabEventType, GrabState } from '../constants';
import { assign as baseAssign, createMachine, TransitionsConfig } from 'xstate';
import type { AnyGrabEvent } from 'types/grab';
import type { GrabContext } from 'types/grab';
import { raise as baseRaise } from 'xstate/lib/actions';

const initGrabContext = (): GrabContext => ({
    id: null,
    message: null,
    dropperId: null,
    peer: null,
    connection: null,
    keyPair: null,
    grabKey: null,
    nonce: null,
});

export const assign = baseAssign<GrabContext>;

export const raise = baseRaise<GrabContext, AnyGrabEvent>;

export const grabMachine = createMachine<GrabContext, AnyGrabEvent>(
    {
        id: 'grab',
        preserveActionOrder: true,
        predictableActionArguments: true,
        context: initGrabContext(),
        initial: GrabState.Initial,
        states: {
            [GrabState.Initial]: {
                on: {
                    INITIALIZE: {
                        target: GrabState.Ready,
                        actions: ['initGrab', raise(GrabEventType.Connect)],
                    },
                } as TransitionsConfig<GrabContext, AnyGrabEvent>,
            },
            [GrabState.Ready]: {
                on: {
                    CONNECT: {
                        target: GrabState.Connected,
                        actions: ['initConnection'],
                    },
                },
            },
            [GrabState.Connected]: {
                on: {
                    HANDSHAKE: {
                        target: GrabState.Waiting,
                        actions: ['setGrabKey', 'sendPublicKey'],
                    },
                },
            },
            [GrabState.Waiting]: {
                on: {
                    GRAB: {
                        target: GrabState.Received,
                        actions: ['grabMessage'],
                    },
                },
            },
            [GrabState.Received]: {
                on: {
                    VERIFY: {
                        target: GrabState.Confirmed,
                        actions: ['startVerification'],
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
                entry: (context, event) => {
                    return assign(initGrabContext());
                },
                type: 'final',
            },
        },
    },
    {
        actions: {
            initGrab: () => {},
            initConnection: () => {},
            setGrabKey: () => {},
            sendPublicKey: () => {},
            grabMessage: () => {},
            startVerification: () => {},
        },
    },
);
