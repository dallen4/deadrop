import { describe, expect, it } from 'vitest';
import { interpret } from 'xstate';
import { dropMachine, initDropContext } from 'lib/machines/drop';
import { DropEventType, DropState } from 'lib/constants';
import { GrabberStatus } from 'types/drop';
import type { DataConnection } from 'peerjs';

const fakeConnection = () =>
  ({ peer: '', send: () => {}, close: () => {} }) as unknown as DataConnection;

const initToAccepting = (maxGrabbers: number | null) => {
  const service = interpret(dropMachine).start();

  service.send({
    type: DropEventType.Init,
    id: 'drop-id',
    peer: {},
    keyPair: {},
    nonce: 'nonce',
    maxGrabbers,
  });

  service.send({
    type: DropEventType.Wrap,
    integrity: 'hash',
  });

  return service;
};

const connectGrabber = (
  service: ReturnType<typeof initToAccepting>,
  grabberId: string,
) => {
  service.send({
    type: DropEventType.GrabberConnected,
    grabberId,
    connection: fakeConnection(),
  });
};

const confirmGrabber = (
  service: ReturnType<typeof initToAccepting>,
  grabberId: string,
) => {
  service.send({
    type: DropEventType.GrabberConfirmed,
    grabberId,
  });
};

describe('dropMachine', () => {
  it('starts in initial and transitions through ready into accepting', () => {
    const service = initToAccepting(1);

    expect(service.state.value).toBe(DropState.Accepting);
  });

  it('maxGrabbers = 1 reproduces single-grabber behavior: completes on first confirm', () => {
    const service = initToAccepting(1);

    connectGrabber(service, 'grabber-1');
    expect(
      service.state.context.grabbers.get('grabber-1')?.status,
    ).toBe(GrabberStatus.Connected);

    confirmGrabber(service, 'grabber-1');

    expect(service.state.value).toBe(DropState.Completed);
    expect(
      service.state.context.grabbers.get('grabber-1')?.status,
    ).toBe(GrabberStatus.Confirmed);
  });

  it('accepts N grabbers and only completes once the cap is reached', () => {
    const service = initToAccepting(3);

    connectGrabber(service, 'grabber-1');
    connectGrabber(service, 'grabber-2');
    connectGrabber(service, 'grabber-3');

    expect(service.state.context.grabbers.size).toBe(3);

    confirmGrabber(service, 'grabber-1');
    expect(service.state.value).toBe(DropState.Accepting);

    confirmGrabber(service, 'grabber-2');
    expect(service.state.value).toBe(DropState.Accepting);

    confirmGrabber(service, 'grabber-3');
    expect(service.state.value).toBe(DropState.Completed);
  });

  it('failed grabbers do not count toward the cap or block completion', () => {
    const service = initToAccepting(2);

    connectGrabber(service, 'grabber-1');
    connectGrabber(service, 'grabber-2');

    service.send({
      type: DropEventType.GrabberFailed,
      grabberId: 'grabber-1',
    });

    expect(
      service.state.context.grabbers.get('grabber-1')?.status,
    ).toBe(GrabberStatus.Failed);
    expect(service.state.value).toBe(DropState.Accepting);

    confirmGrabber(service, 'grabber-2');

    // only 1 confirmed grabber against a cap of 2 - not yet complete
    expect(service.state.value).toBe(DropState.Accepting);
  });

  it('completes immediately on STOP_ACCEPTING regardless of cap', () => {
    const service = initToAccepting(5);

    connectGrabber(service, 'grabber-1');
    confirmGrabber(service, 'grabber-1');

    expect(service.state.value).toBe(DropState.Accepting);

    service.send({ type: DropEventType.StopAccepting });

    expect(service.state.value).toBe(DropState.Completed);
    expect(service.state.context.accepting).toBe(false);
  });

  it('unbounded sessions (maxGrabbers = null) never auto-complete on confirm', () => {
    const service = initToAccepting(null);

    connectGrabber(service, 'grabber-1');
    confirmGrabber(service, 'grabber-1');

    connectGrabber(service, 'grabber-2');
    confirmGrabber(service, 'grabber-2');

    expect(service.state.value).toBe(DropState.Accepting);

    service.send({ type: DropEventType.StopAccepting });

    expect(service.state.value).toBe(DropState.Completed);
  });

  it('does not accept new grabbers once a cap-reached completion has occurred', () => {
    const service = initToAccepting(1);

    connectGrabber(service, 'grabber-1');
    confirmGrabber(service, 'grabber-1');

    expect(service.state.value).toBe(DropState.Completed);

    connectGrabber(service, 'grabber-2');

    // Completed is final - no transitions are defined out of it
    expect(service.state.value).toBe(DropState.Completed);
    expect(service.state.context.grabbers.has('grabber-2')).toBe(
      false,
    );
  });
});

describe('initDropContext', () => {
  it('defaults to maxGrabbers = 1 and accepting = true', () => {
    const ctx = initDropContext();

    expect(ctx.maxGrabbers).toBe(1);
    expect(ctx.accepting).toBe(true);
    expect(ctx.grabbers.size).toBe(0);
  });
});
