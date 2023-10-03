import { generateKeyPair } from '@shared/lib/crypto/operations';
import { get } from '@shared/lib/fetch';
import { grabMachine, initGrabContext } from '@shared/lib/machines/grab';
import { DropDetails } from '@shared/types/common';
import { loader } from 'lib/loader';
import { displayWelcomeMessage, logError, logInfo } from 'lib/log';
import { initPeer } from 'lib/peer';
import { DROP_API_PATH } from '@shared/config/paths';
import { AnyGrabEvent, InitGrabEvent } from '@shared/types/grab';
import { cleanup } from 'lib/session';
import { GrabEventType } from '@shared/lib/constants';

export const grab = async (id: string) => {
    const ctx = initGrabContext();
    let currState = grabMachine.initialState;

    const sendEvent = (event: AnyGrabEvent) => {
        currState = grabMachine.transition(currState, event);
        return currState;
    };

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
        cleanup(ctx);

        return;
    }

    ctx.dropperId = details.peerId;
    ctx.nonce = details.nonce;

    const event: InitGrabEvent = {
        type: GrabEventType.Init,
        id: ctx.id,
        dropperId: ctx.dropperId,
        peer: ctx.peer,
        keyPair: ctx.keyPair,
        nonce: ctx.nonce,
    };

    sendEvent(event);

    ctx.connection = ctx.peer!.connect(ctx.dropperId);

    ctx.connection.on('error', console.error);
    ctx.connection.on('open', () => {
        logInfo('Drop connection successful...');

        sendEvent({ type: GrabEventType.Connect });
    });
};
