import type {
  AnyDropEvent,
  DropContext,
  GrabberConnectedEvent,
  GrabberConfirmedEvent,
  GrabberFailedEvent,
  GrabberProgressEvent,
  GrabberRecord,
  InitDropEvent,
  WrapEvent,
} from '../../types/drop';
import { GrabberStatus } from '../../types/drop';
import { DropEventType, DropState } from '../constants';
import { assign, createMachine } from 'xstate';

export const initDropContext = (): DropContext => ({
  id: null,
  mode: 'raw',
  message: '',
  integrity: null,
  peer: null,
  connection: null,
  keyPair: null,
  nonce: null,
  grabbers: new Map(),
  maxGrabbers: 1, // default = today's single-grabber behavior
  accepting: true,
});

const cloneGrabbers = (ctx: DropContext) =>
  new Map<string, GrabberRecord>(ctx.grabbers);

// connected, transferring, or confirmed — anything not yet failed
const inflightCount = (ctx: DropContext) =>
  [...ctx.grabbers.values()].filter(
    (g) => g.status !== GrabberStatus.Failed,
  ).length;

const confirmedCount = (ctx: DropContext) =>
  [...ctx.grabbers.values()].filter(
    (g) => g.status === GrabberStatus.Confirmed,
  ).length;

// only confirmed grabbers count toward maxGrabbers
const reachedCap = (ctx: DropContext) =>
  ctx.maxGrabbers != null && confirmedCount(ctx) >= ctx.maxGrabbers;

// guards must read context as it is *before* the action runs, so account
// for the grabber this event is about confirming
const reachedCapOnConfirm = (ctx: DropContext, event: AnyDropEvent) => {
  const evt = event as GrabberConfirmedEvent;

  if (ctx.maxGrabbers == null) return false;

  const confirmed = new Set(
    [...ctx.grabbers.values()]
      .filter((g) => g.status === GrabberStatus.Confirmed)
      .map((g) => g.peerId),
  );

  confirmed.add(evt.grabberId);

  return confirmed.size >= ctx.maxGrabbers;
};

const canAccept = (ctx: DropContext) =>
  ctx.accepting &&
  (ctx.maxGrabbers == null || inflightCount(ctx) < ctx.maxGrabbers);

const assignInit = assign<DropContext, AnyDropEvent>((ctx, event) => {
  const evt = event as InitDropEvent;

  return {
    id: evt.id,
    peer: evt.peer,
    keyPair: evt.keyPair,
    nonce: evt.nonce,
    maxGrabbers: evt.maxGrabbers,
  };
});

const assignWrap = assign<DropContext, AnyDropEvent>((_ctx, event) => {
  const evt = event as WrapEvent;

  return { integrity: evt.integrity };
});

const addGrabber = assign<DropContext, AnyDropEvent>((ctx, event) => {
  const evt = event as GrabberConnectedEvent;

  const grabbers = cloneGrabbers(ctx);

  grabbers.set(evt.grabberId, {
    peerId: evt.grabberId,
    connection: evt.connection,
    dropKey: null,
    status: GrabberStatus.Connected,
    connectedAt: Date.now(),
    confirmedAt: null,
  });

  return { grabbers };
});

const updateGrabberStatus = assign<DropContext, AnyDropEvent>(
  (ctx, event) => {
    const evt = event as GrabberProgressEvent;

    const grabbers = cloneGrabbers(ctx);
    const grabber = grabbers.get(evt.grabberId);

    if (grabber)
      grabbers.set(evt.grabberId, {
        ...grabber,
        status: evt.status,
      });

    return { grabbers };
  },
);

const markConfirmed = assign<DropContext, AnyDropEvent>(
  (ctx, event) => {
    const evt = event as GrabberConfirmedEvent;

    const grabbers = cloneGrabbers(ctx);
    const grabber = grabbers.get(evt.grabberId);

    if (grabber)
      grabbers.set(evt.grabberId, {
        ...grabber,
        status: GrabberStatus.Confirmed,
        confirmedAt: Date.now(),
      });

    return { grabbers };
  },
);

const markFailed = assign<DropContext, AnyDropEvent>((ctx, event) => {
  const evt = event as GrabberFailedEvent;

  const grabbers = cloneGrabbers(ctx);
  const grabber = grabbers.get(evt.grabberId);

  if (grabber)
    grabbers.set(evt.grabberId, {
      ...grabber,
      status: GrabberStatus.Failed,
    });

  return { grabbers };
});

const stopAccepting = assign<DropContext, AnyDropEvent>(() => ({
  accepting: false,
}));

export const dropMachine = createMachine<DropContext, AnyDropEvent>({
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
          actions: [assignInit],
        },
      },
    },
    [DropState.Ready]: {
      on: {
        // staging the payload also opens the session for grabbers
        [DropEventType.Wrap]: {
          target: DropState.Accepting,
          actions: [assignWrap],
        },
        // explicit start (payload may have been staged before init)
        [DropEventType.Ready]: {
          target: DropState.Accepting,
        },
      },
    },
    [DropState.Accepting]: {
      on: {
        [DropEventType.GrabberConnected]: {
          cond: canAccept,
          actions: [addGrabber],
        },
        [DropEventType.GrabberProgress]: {
          actions: [updateGrabberStatus],
        },
        [DropEventType.GrabberConfirmed]: [
          {
            cond: reachedCapOnConfirm,
            target: DropState.Completed,
            actions: [markConfirmed],
          },
          {
            actions: [markConfirmed],
          },
        ],
        [DropEventType.GrabberFailed]: {
          actions: [markFailed],
        },
        [DropEventType.StopAccepting]: {
          target: DropState.Completed,
          actions: [stopAccepting],
        },
      },
    },
    [DropState.Error]: {},
    [DropState.Completed]: {
      type: 'final',
    },
  },
});

export { reachedCap };
