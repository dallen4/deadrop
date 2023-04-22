import { MessageType } from '@shared/lib/constants';
import { BaseMessage, MessageHandler } from '@shared/types/messages';

export class MessageMutex {
    private _currentMessageType: MessageType | null;
    private _processed: Set<MessageType>;

    constructor() {
        this._currentMessageType = null;
        this._processed = new Set();
    }

    lock(messageType: MessageType) {
        if (
            this._processed.has(messageType) ||
            this._currentMessageType === messageType
        )
            return false;

        this._currentMessageType = messageType;
        return true;
    }

    unlock() {
        this._processed.add(this._currentMessageType!);
        this._currentMessageType = null;
    }
}

export function withMessageLock(
    mutex: MessageMutex,
    handler: MessageHandler,
    log = console.log,
): MessageHandler {
    return async (msg: BaseMessage) => {
        const lockAcquired = mutex.lock(msg.type);

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
            mutex.unlock();
        }
    };
}
