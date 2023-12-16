import { grabMachine, initGrabContext } from '@shared/lib/machines/grab';
import { displayWelcomeMessage, logDebug, logError, logInfo } from 'lib/log';
import { initPeer } from 'lib/peer';
import { AnyGrabEvent, GrabContext } from '@shared/types/grab';
import { cleanupSession } from 'lib/session';
import { MessageType } from '@shared/lib/constants';
import { decryptFile, hashFile } from 'lib/crypto';
import { createGrabHandlers } from '@shared/handlers/grab';
import { DropContext } from '@shared/types/drop';

export const grab = async (id: string) => {
    const ctx = initGrabContext();

    let currState = grabMachine.initialState;

    const sendEvent = (event: AnyGrabEvent) => {
        currState = grabMachine.transition(currState, event);
        return currState;
    };

    const cleanup = (ctx: GrabContext | DropContext) => {
        cleanupSession(ctx);
        process.exit(1);
    };

    ctx.id = id;

    displayWelcomeMessage();

    const { init } = createGrabHandlers({
        ctx,
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
        cleanupSession: cleanup,
        apiUri: process.env.DEADDROP_API_URL!,
    });

    await init();
};
