import type {
  AnyDropEvent,
  ConnectEvent,
  ConnectionContext,
  DropContext,
  InitDropEvent,
  WrapEvent,
} from '../../types/drop';
import { DropEventType, DropState } from '../constants';
import { createMachine, sendParent, spawn } from 'xstate';
import { raise as baseRaise } from 'xstate/lib/actions';

export const raise = baseRaise<ConnectionContext, AnyDropEvent>;

export const initDropContext = (): DropContext => ({
  // drop details
  id: null,
  peer: null,
  mode: 'raw',
  message: null,

  // crypto
  keyPair: null,
  dropKey: null,
  nonce: null,
  integrity: null,

  // session state
  drops: new Map(),
  connections: new Map(),

  // session meta
  maxSessions: 1,
  activeSessions: 0,
  completedSessions: 0,
});

// Connection machine handles individual grab flow
export const connectionMachine = createMachine<
  ConnectionContext,
  AnyDropEvent,
  { value: DropState; context: ConnectionContext }
>({
  id: 'connection',
  preserveActionOrder: true,
  predictableActionArguments: true,
  initial: DropState.Connected,
  states: {
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
        [DropEventType.Drop]: {
          target: DropState.AwaitingConfirmation,
        },
      },
    },
    [DropState.AwaitingConfirmation]: {
      on: {
        [DropEventType.ConnectionComplete]: {
          target: DropState.Completed,
        },
      },
    },
    [DropState.Error]: {
      type: 'final',
      entry: [sendParent(DropEventType.ConnectionComplete)],
    },
    [DropState.Completed]: {
      type: 'final',
      entry: [sendParent(DropEventType.ConnectionComplete)],
    },
  },
});

// Drop machine handles initialization and connection tracking
export const dropMachine = createMachine<
  DropContext,
  AnyDropEvent,
  { value: DropState; context: DropContext }
>({
  id: 'drop',
  preserveActionOrder: true,
  predictableActionArguments: true,
  initial: DropState.Initial,
  context: initDropContext(),
  states: {
    [DropState.Initial]: {
      on: {
        [DropEventType.Init]: {
          target: DropState.Ready,
          actions: [
            (context, event: InitDropEvent) => {
              const { id, peer, keyPair, nonce } = event;

              context.id = id;
              context.peer = peer;
              context.keyPair = keyPair;
              context.nonce = nonce;
            },
          ],
        },
      },
    },
    [DropState.Ready]: {
      on: {
        [DropEventType.Wrap]: {
          target: DropState.Waiting,
          actions: [
            (context, event: WrapEvent) => {
              const { payload, integrity } = event;

              context.message = payload;
              context.integrity = integrity;
            },
          ],
        },
      },
    },
    [DropState.Waiting]: {
      on: {
        [DropEventType.Connect]: {
          actions: [
            (context, event: ConnectEvent) => {
              const { connection } = event;

              if (
                connection &&
                context.activeSessions < context.maxSessions
              ) {
                context.connections.set(connection.peer, connection);
                context.activeSessions++;

                const newDrop = spawn(connectionMachine);
                context.drops.set(connection.peer, newDrop);
              } else {
                // reject connection
                if (connection.open) connection.close();
              }
            },
          ],
        },
        [DropEventType.ConnectionComplete]: {
          target: DropState.Completed,
          cond: (context) => {
            context.completedSessions++;

            // all sessions completed b/c max sessions reached
            return context.completedSessions === context.maxSessions;
          },
        },
      },
    },
    [DropState.Error]: {},
    [DropState.Completed]: {
      type: 'final',
    },
  },
});
