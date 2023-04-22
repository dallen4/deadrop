import { MessageType } from '@shared/lib/constants';

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
