import { MessageType } from '@shared/lib/constants';
import { BaseMessage, MessageHandler } from '@shared/types/messages';

function createMessageMutex() {
    let currentMessageType: MessageType | null = null;
    const processed = new Set<MessageType>();

    const lock = (messageType: MessageType) => {
        if (processed.has(messageType) || currentMessageType === messageType)
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
