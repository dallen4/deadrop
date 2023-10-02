import { generateKeyPair } from '@shared/lib/crypto/operations';
import { get } from '@shared/lib/fetch';
import { initGrabContext } from '@shared/lib/machines/grab';
import { DropDetails } from '@shared/types/common';
import { loader } from 'lib/loader';
import { displayWelcomeMessage, logError, logInfo } from 'lib/log';
import { initPeer } from 'lib/peer';
import { DROP_API_PATH } from '@shared/config/paths';

export const grab = async (id: string) => {
    const ctx = initGrabContext();
    let currState = null;

    ctx.id = id;

    displayWelcomeMessage();

    ctx.keyPair = await generateKeyPair();

    logInfo('Key pair generated...');

    loader.start('Initializing peer...');

    ctx.peer = await initPeer();

    loader.stop();

    logInfo('Peer successfully connected!');

    logInfo('Fetching drop details...');

    const details = await get<DropDetails>(
        process.env.DEADDROP_API_URL! + DROP_API_PATH,
        {
            id: ctx.id,
        },
    );

    if (!details) {
        logError(`Drop instance ${ctx.id} not found, closing connection...`);

        // cleanup();
        return;
    }

    ctx.dropperId = details.peerId;
    ctx.nonce = details.nonce;
};
