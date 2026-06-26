import { MessageType } from 'lib/constants';
import {
  createMessageMutex,
  withMessageLock,
  withGrabberMessageLock,
  GrabberMessageHandler,
} from 'lib/messages';
import { BaseMessage, MessageHandler } from 'types/messages';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.clearAllMocks();
});

describe('message mutex locking', () => {
  it('only allows lock to be acquired once', () => {
    const { lock } = createMessageMutex();

    const acquired = lock(MessageType.Handshake);

    expect(acquired).toBe(true);

    const acquired2 = lock(MessageType.Handshake);

    expect(acquired2).toBe(false);
  });

  it('lock cannot be acquired for same message type twice', () => {
    const { lock, unlock } = createMessageMutex();

    const acquired = lock(MessageType.Handshake);

    expect(acquired).toBe(true);

    unlock();

    const acquired2 = lock(MessageType.Handshake);

    expect(acquired2).toBe(false);
  });

  it('lock can be acquired for next message type', () => {
    const { lock, unlock } = createMessageMutex();

    const acquired = lock(MessageType.Handshake);

    expect(acquired).toBe(true);

    unlock();

    const acquired2 = lock(MessageType.Payload);

    expect(acquired2).toBe(true);
  });

  it('lock-wrapped handler runs successfully', async () => {
    let handlerState = false;

    const mocks: { handler: MessageHandler } = {
      handler: async () => {},
    };

    const mockedHandler = vi
      .spyOn(mocks, 'handler')
      .mockImplementationOnce(async (_msg) => {
        handlerState = true;
      });

    const wrappedHandler = withMessageLock(mocks.handler);

    const sampleMessage: BaseMessage = {
      type: MessageType.Handshake,
    };

    await wrappedHandler(sampleMessage);

    expect(mockedHandler).toHaveBeenCalled();
    expect(handlerState).toBe(true);
  });

  it('lock-wrapped handler does not run if MessageType has been handled before', async () => {
    let handlerState = 0;

    const mocks: { handler: MessageHandler } = {
      handler: async () => {},
    };

    const mockedHandler = vi
      .spyOn(mocks, 'handler')
      .mockImplementationOnce(async (_msg) => {
        handlerState++;
      });

    const wrappedHandler = withMessageLock(mocks.handler);

    const sampleMessage: BaseMessage = {
      type: MessageType.Handshake,
    };

    await wrappedHandler(sampleMessage);

    expect(mockedHandler).toHaveBeenCalled();
    expect(handlerState).toBe(1);

    // call again with same MessageType
    await wrappedHandler(sampleMessage);

    // handler shouldn't run b/c lock failed to acquire
    expect(mockedHandler).toHaveBeenCalledTimes(1);
    expect(handlerState).toBe(1);
  });

  it('lock-wrapped handler runs if MessageType has not been handled before', async () => {
    let handlerState = 0;

    const mocks: { handler: MessageHandler } = {
      handler: async () => {},
    };

    const mockedHandler = vi
      .spyOn(mocks, 'handler')
      .mockImplementation(async (_msg) => {
        handlerState++;
      });

    const wrappedHandler = withMessageLock(mocks.handler);

    const sampleMessage: BaseMessage = {
      type: MessageType.Handshake,
    };

    await wrappedHandler(sampleMessage);

    expect(mockedHandler).toHaveBeenCalled();
    expect(handlerState).toBe(1);

    const sampleMessage2: BaseMessage = {
      type: MessageType.Payload,
    };

    // call again with same MessageType
    await wrappedHandler(sampleMessage2);

    // handler shouldn't run b/c lock failed to acquire
    expect(mockedHandler).toHaveBeenCalledTimes(2);
    expect(handlerState).toBe(2);
  });
});

describe('per-grabber message lock isolation', () => {
  it('does not serialize concurrent grabbers against one another', async () => {
    const calls: Array<string> = [];

    const mocks: { handler: GrabberMessageHandler } = {
      handler: async () => {},
    };

    vi.spyOn(mocks, 'handler').mockImplementation(
      async (grabberId, _msg) => {
        calls.push(grabberId);
      },
    );

    const wrappedHandler = withGrabberMessageLock(mocks.handler);

    const sampleMessage: BaseMessage = {
      type: MessageType.Handshake,
    };

    // grabber A's Handshake locks grabber A only; grabber B's Handshake
    // (same MessageType) must still be allowed through immediately
    await Promise.all([
      wrappedHandler('grabber-a', sampleMessage),
      wrappedHandler('grabber-b', sampleMessage),
    ]);

    expect(calls).toContain('grabber-a');
    expect(calls).toContain('grabber-b');
    expect(calls).toHaveLength(2);
  });

  it('still blocks a repeated MessageType for the same grabber', async () => {
    let handlerState = 0;

    const mocks: { handler: GrabberMessageHandler } = {
      handler: async () => {},
    };

    const mockedHandler = vi
      .spyOn(mocks, 'handler')
      .mockImplementation(async (_grabberId, _msg) => {
        handlerState++;
      });

    const wrappedHandler = withGrabberMessageLock(mocks.handler);

    const sampleMessage: BaseMessage = {
      type: MessageType.Handshake,
    };

    await wrappedHandler('grabber-a', sampleMessage);
    await wrappedHandler('grabber-a', sampleMessage);

    expect(mockedHandler).toHaveBeenCalledTimes(1);
    expect(handlerState).toBe(1);
  });

  it('allows a new MessageType from a grabber that already handled a prior type', async () => {
    let handlerState = 0;

    const mocks: { handler: GrabberMessageHandler } = {
      handler: async () => {},
    };

    const mockedHandler = vi
      .spyOn(mocks, 'handler')
      .mockImplementation(async (_grabberId, _msg) => {
        handlerState++;
      });

    const wrappedHandler = withGrabberMessageLock(mocks.handler);

    await wrappedHandler('grabber-a', { type: MessageType.Handshake });
    await wrappedHandler('grabber-a', { type: MessageType.Verify });

    expect(mockedHandler).toHaveBeenCalledTimes(2);
    expect(handlerState).toBe(2);
  });
});
