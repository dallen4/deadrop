import type { PayloadInputMode } from '@shared/types/common';
import inquirer from 'inquirer';
import { loader } from 'lib/loader';
import { displayWelcomeMessage, logError, logInfo } from 'lib/log';
import { initPeer } from 'lib/peer';
import { nanoid } from 'nanoid';

type DropOptions = {
    input?: string;
    dropType?: PayloadInputMode;
};

export const drop = async (input: string | undefined, options: DropOptions) => {
    displayWelcomeMessage();

    const secretInput = input || options.input;

    if (!secretInput) {
        logError('Invalid input provided');
        return;
    }

    loader.start('Initializing peer...');

    const peer = await initPeer(nanoid());

    loader.stop();

    logInfo('Peer successfully connected!');

    const answer = await inquirer.prompt([
        {
            name: 'testname',
            type: 'input',
            message: 'input here: ',
        },
    ]);

    console.log(answer);
    peer.disconnect();
};
