import {
    decryptRaw,
    deriveKey,
    exportKey,
    generateKeyPair,
    hashRaw,
    importKey,
} from '@shared/lib/crypto/operations';
import { get } from '@shared/lib/fetch';
import { grabMachine, initGrabContext } from '@shared/lib/machines/grab';
import { DropDetails } from '@shared/types/common';
import { loader } from 'lib/loader';
import { displayWelcomeMessage, logDebug, logError, logInfo } from 'lib/log';
import { initPeer } from 'lib/peer';
import { DROP_API_PATH } from '@shared/config/paths';
import {
    AckHandshakeEvent,
    AnyGrabEvent,
    InitGrabEvent,
} from '@shared/types/grab';
import { cleanupSession } from 'lib/session';
import {
    GrabEventType,
    GrabMessageOrderMap,
    MessageType,
} from '@shared/lib/constants';
import { withMessageLock } from '@shared/lib/messages';
import {
    BaseMessage,
    ConfirmIntegrityMessage,
    DropMessage,
    HandshakeMessage,
    VerifyMessage,
} from '@shared/types/messages';
import { decryptFile, hashFile } from 'lib/crypto';
import { createGrabHandlers } from '@shared/handlers/grab';

export const grab = async (id: string) => {
    const ctx = initGrabContext();
    const timers = new Map<MessageType, NodeJS.Timeout>();

    let currState = grabMachine.initialState;

    const sendEvent = (event: AnyGrabEvent) => {
        currState = grabMachine.transition(currState, event);
        return currState;
    };

    ctx.id = id;

    displayWelcomeMessage();

    const { init } = createGrabHandlers({
        ctx,
        timers,
        sendEvent,
        logger: {
            info: logInfo,
            error: logError,
            debug: logDebug,
        },
        file: {
            decrypt: decryptFile,
            hash: hashFile,
        },
        initPeer,
        cleanupSession,
        apiUri: process.env.DEADDROP_API_URL!,
    });

    await init();
};
