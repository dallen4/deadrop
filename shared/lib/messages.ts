import { MessageType } from './constants';
import { BaseMessage, MessageHandler } from '../types/messages';

export function createMessageMutex() {
  let currentMessageType: MessageType | null = null;
  const processed = new Set<MessageType>();

  const lock = (messageType: MessageType) => {
    if (
      processed.has(messageType) ||
      currentMessageType === messageType
    )
      return false;

    currentMessageType = messageType;
    return true;
  };

  const unlock = () => {
    processed.add(currentMessageType!);
    currentMessageType = null;
  };

  return { lock, unlock };
}

export function withMessageLock(
  handler: MessageHandler,
  log = console.log,
): MessageHandler {
  const { lock, unlock } = createMessageMutex();

  return async (msg: BaseMessage) => {
    const lockAcquired = lock(msg.type);

    if (!lockAcquired) {
      console.info(`${msg.type} received & ignored...`);
      return;
    }

    try {
      await handler(msg);
    } catch (err) {
      log('Potentially fatal error occurred');
      console.error(err);
    } finally {
      unlock();
    }
  };
}

export type GrabberMessageHandler = (
  grabberId: string,
  msg: BaseMessage,
) => Promise<void>;

/**
 * Multidrop variant of {@link withMessageLock}. Each grabber gets its own
 * message mutex (keyed by grabberId), so concurrent grabbers never serialize
 * against one another — a Handshake from grabber A does not block a Handshake
 * from grabber B.
 */
export function withGrabberMessageLock(
  handler: GrabberMessageHandler,
  log = console.log,
): GrabberMessageHandler {
  const mutexes = new Map<
    string,
    ReturnType<typeof createMessageMutex>
  >();

  const getMutex = (grabberId: string) => {
    let mutex = mutexes.get(grabberId);

    if (!mutex) {
      mutex = createMessageMutex();
      mutexes.set(grabberId, mutex);
    }

    return mutex;
  };

  return async (grabberId: string, msg: BaseMessage) => {
    const { lock, unlock } = getMutex(grabberId);

    const lockAcquired = lock(msg.type);

    if (!lockAcquired) {
      console.info(
        `${msg.type} received & ignored for grabber ${grabberId}...`,
      );
      return;
    }

    try {
      await handler(grabberId, msg);
    } catch (err) {
      log('Potentially fatal error occurred');
      console.error(err);
    } finally {
      unlock();
    }
  };
}
