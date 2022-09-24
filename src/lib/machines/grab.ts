import { GrabState } from '../constants';
import { assign as baseAssign, createMachine } from 'xstate';
import type { AnyGrabEvent } from 'types/grab';
import type { GrabContext } from 'types/grab';

const initGrabContext = (): GrabContext => ({
    id: null,
    message: null,
    peer: null,
    connection: null,
    keyPair: null,
    grabKey: null,
    nonce: null,
});

export const assign = baseAssign<GrabContext>;

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
                        actions: ['initGrab'],
                    },
                },
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
                        actions: ['deriveKey', 'sendPublicKey'],
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
                    UNWRAP: {
                        target: GrabState.Confirmed,
                        actions: ['decryptAndVerify'],
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
            deriveKey: () => {},
            sendPublicKey: () => {},
            grabMessage: () => {},
            decryptAndVerify: () => {},
        },
    },
);
