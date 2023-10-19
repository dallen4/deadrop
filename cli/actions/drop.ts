import inquirer from 'inquirer';
import { loader } from 'lib/loader';
import { displayWelcomeMessage, logDebug, logError, logInfo } from 'lib/log';
import { dropMachine, initDropContext } from '@shared/lib/machines/drop';
import { DropEventType, MessageType } from '@shared/lib/constants';
import { AnyDropEvent, InitDropEvent } from '@shared/types/drop';
import { encryptFile, hashFile } from 'lib/crypto';
import { generateGrabUrl } from 'lib/util';
import chalk from 'chalk';
import { cleanupSession } from 'lib/session';
import QRCode from 'qrcode';
import { createDropHandlers } from '@shared/handlers/drop';

type DropOptions = {
    input?: string;
    file?: boolean;
};

export const drop = async (input: string | undefined, options: DropOptions) => {
    const ctx = initDropContext();
    const timers = new Map<MessageType, NodeJS.Timeout>();

    let currState = dropMachine.initialState;

    displayWelcomeMessage();

    const sendEvent = (event: AnyDropEvent) => {
        currState = dropMachine.transition(currState, event);
        return currState;
    };

    const { init, stagePayload } = createDropHandlers({
        ctx,
        timers,
        sendEvent,
        logger: {
            info: logInfo,
            error: logError,
            debug: logDebug,
        },
        file: {
            encrypt: (...args) =>
                encryptFile(args[0], args[1], args[2]).then((res) => res.data),
            hash: hashFile,
        },
        cleanupSession,
        apiUri: process.env.DEADDROP_API_URL!,
        peerServerUri: process.env.PEER_SERVER_URL!,
    });

    ctx.message = input || options.input || null;
    ctx.mode = options.file ? 'file' : 'raw';

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

    await stagePayload(ctx.message as string, ctx.mode);

    loader.start('Initializing drop session...');

    await init();

    loader.stop();

    logInfo('Peer connected & keys generated!');

    const grabLink = generateGrabUrl(ctx.id!);

    logInfo(`Use grab link: ${chalk.bold(grabLink)}`);

    const grabQR = await QRCode.toString(grabLink, {
        type: 'terminal',
        small: true,
    });

    logInfo(`Or scan the QR code:\n${grabQR}`);

    loader.text = 'Waiting for grab request...';

    const initEvent: InitDropEvent = {
        type: DropEventType.Init,
        id: ctx.id!,
        peer: ctx.peer!,
        keyPair: ctx.keyPair!,
        nonce: ctx.nonce!,
    };

    sendEvent(initEvent);
};
