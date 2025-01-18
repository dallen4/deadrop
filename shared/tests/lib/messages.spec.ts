import { MessageType } from 'lib/constants';
import { createMessageMutex, withMessageLock } from 'lib/messages';
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
