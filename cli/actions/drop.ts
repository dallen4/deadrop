import type { InitDropResult, PayloadInputMode } from '@shared/types/common';
import inquirer from 'inquirer';
import { loader } from 'lib/loader';
import { displayWelcomeMessage, logError, logInfo } from 'lib/log';
import { initPeer } from 'lib/peer';
import { DataConnection } from 'peerjs';
import { dropMachine, initDropContext } from '@shared/lib/machines/drop';
import { DropEventType } from '@shared/lib/constants';
import { generateKeyPair } from '@shared/lib/crypto/operations';
import { post } from '@shared/lib/fetch';
import { AnyDropEvent, InitDropEvent } from '@shared/types/drop';
import { DROP_API_PATH } from '@shared/config/paths';
import { cleanup } from 'lib/session';

type DropOptions = {
    input?: string;
    dropType?: PayloadInputMode;
};

export const drop = async (input: string | undefined, options: DropOptions) => {
    const ctx = initDropContext();
    let currState = dropMachine.initialState;

    const sendEvent = (event: AnyDropEvent) => {
        currState = dropMachine.transition(currState, event);
        return currState;
    };

    ctx.message = input || options.input || null;

    displayWelcomeMessage();

    if (!ctx.message) {
        logInfo('No input provided...');

        const answer = await inquirer.prompt([
            {
                name: 'input',
                type: 'input',
                message: 'input here: ',
            },
        ]);

        ctx.message = answer.input;
    }

    ctx.keyPair = await generateKeyPair();

    logInfo('Key pair generated...');

    loader.start('Initializing peer...');

    ctx.peer = await initPeer();

    loader.stop();

    logInfo('Peer successfully connected!');

    const onConnection = (newConnection: DataConnection) => {
        if (ctx.connection) {
            logError('Drop connection already exists!');
            newConnection.close();
            return;
        }

        ctx.connection = newConnection;

        sendEvent({
            type: DropEventType.Connect,
            connection: ctx.connection,
        });
    };

    ctx.peer.on('connection', onConnection);

    const { id, nonce } = await post<InitDropResult, { id: string }>(
        process.env.DEADDROP_API_URL! + DROP_API_PATH,
        {
            id: ctx.peer.id,
        },
    );

    ctx.id = id;
    ctx.nonce = nonce;

    loader.start('Waiting for grab request...');

    const initEvent: InitDropEvent = {
        type: DropEventType.Init,
        id,
        peer: ctx.peer,
        keyPair: ctx.keyPair,
        nonce,
    };

    sendEvent(initEvent);

    cleanup(ctx);
};
