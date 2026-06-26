import { EventEmitter } from 'events';
import { DropEventType } from '@shared/lib/constants';
import { initDropContext } from '@shared/lib/machines/drop';
import type {
  GrabberConfirmedEvent,
  GrabberConnectedEvent,
  InitDropEvent,
  WrapEvent,
} from '@shared/types/drop';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lib/log', () => ({
  loader: { start: vi.fn(), stop: vi.fn() },
  logDebug: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
  printGrabberList: vi.fn(),
  resetGrabberList: vi.fn(),
}));

import { printGrabberList } from 'lib/log';
import { createSendEvent, listenForStopKey } from 'logic/drop';

const initEvent = (maxGrabbers: number | null = null): InitDropEvent => ({
  type: DropEventType.Init,
  id: 'drop-1',
  peer: {} as InitDropEvent['peer'],
  keyPair: {} as InitDropEvent['keyPair'],
  nonce: 'nonce',
  maxGrabbers,
});

const wrapEvent = (): WrapEvent => ({
  type: DropEventType.Wrap,
  integrity: 'hash',
});

describe('createSendEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not complete on init/wrap alone', () => {
    const ctx = initDropContext();
    const onCompleted = vi.fn();
    const sendEvent = createSendEvent(ctx, onCompleted);

    sendEvent(initEvent());
    sendEvent(wrapEvent());

    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('completes when a stop-accepting event is sent', () => {
    const ctx = initDropContext();
    const onCompleted = vi.fn();
    const sendEvent = createSendEvent(ctx, onCompleted);

    sendEvent(initEvent());
    sendEvent(wrapEvent());
    sendEvent({ type: DropEventType.StopAccepting });

    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(printGrabberList).toHaveBeenCalled();
  });

  it('completes once the confirmed cap is reached', () => {
    const ctx = initDropContext();
    ctx.maxGrabbers = 1;

    const onCompleted = vi.fn();
    const sendEvent = createSendEvent(ctx, onCompleted);

    sendEvent(initEvent(1));
    sendEvent(wrapEvent());

    const connected: GrabberConnectedEvent = {
      type: DropEventType.GrabberConnected,
      grabberId: 'grabber-1',
      connection: {} as GrabberConnectedEvent['connection'],
    };

    sendEvent(connected);
    expect(onCompleted).not.toHaveBeenCalled();

    const confirmed: GrabberConfirmedEvent = {
      type: DropEventType.GrabberConfirmed,
      grabberId: 'grabber-1',
    };

    sendEvent(confirmed);

    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('does not re-render the list for non-grabber events', () => {
    const ctx = initDropContext();
    const sendEvent = createSendEvent(ctx, vi.fn());

    sendEvent(initEvent());
    sendEvent(wrapEvent());

    expect(printGrabberList).not.toHaveBeenCalled();
  });
});

class FakeStdin extends EventEmitter {
  isTTY = true;
  setRawMode = vi.fn();
  resume = vi.fn();
  pause = vi.fn();
}

describe('listenForStopKey', () => {
  it('triggers the callback once on any keypress', () => {
    const stdin = new FakeStdin();
    const proc = new EventEmitter() as unknown as NodeJS.Process;
    const onStop = vi.fn();

    listenForStopKey(onStop, stdin as unknown as NodeJS.ReadStream, proc);

    stdin.emit('data', Buffer.from('a'));
    stdin.emit('data', Buffer.from('b'));

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(stdin.setRawMode).toHaveBeenCalledWith(true);
  });

  it('triggers the callback on Ctrl-C (SIGINT)', () => {
    const stdin = new FakeStdin();
    const proc = new EventEmitter() as unknown as NodeJS.Process;
    const onStop = vi.fn();

    listenForStopKey(onStop, stdin as unknown as NodeJS.ReadStream, proc);

    (proc as unknown as EventEmitter).emit('SIGINT');

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('returns a cleanup function that removes listeners', () => {
    const stdin = new FakeStdin();
    const proc = new EventEmitter() as unknown as NodeJS.Process;
    const onStop = vi.fn();

    const stop = listenForStopKey(
      onStop,
      stdin as unknown as NodeJS.ReadStream,
      proc,
    );

    stop();

    stdin.emit('data', Buffer.from('a'));

    expect(onStop).not.toHaveBeenCalled();
    expect(stdin.setRawMode).toHaveBeenCalledWith(false);
  });
});
