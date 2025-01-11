import { MessageType } from 'lib/constants';
import { createMessageMutex } from 'lib/messages';
import { describe, expect, it } from 'vitest';

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
});
