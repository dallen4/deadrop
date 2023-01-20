#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { description, version } from './package.json';
import { nanoid } from 'nanoid';
import inquirer from 'inquirer';
import { displayWelcomeMessage, logError } from 'lib/log';
import { initPeer } from 'lib/peer';

const program = new Command();

program.name('deaddrop-cli').description(description).version(version);

program
    .command('drop')
    .argument('[input]', 'secret to drop')
    .option('-i, --input [input]', 'secret to drop')
    .option('-t, --type [dropType]', 'type of secret being dropped')
    .action(async (input: string | undefined, options) => {
        displayWelcomeMessage();

        const secretInput = input || options.input as string | undefined;

        if (!secretInput) {
            logError('Invalid input provided');
            return;
        }

        const peer = await initPeer(nanoid());
console.log(peer);
        const answer = await inquirer.prompt([
            {
                name: 'testname',
                type: 'input',
                message: 'input here: ',
            },
        ]);

        console.log(answer);
        peer.disconnect();
    });

program
    .command('grab')
    .argument('<id>', 'drop session ID')
    .action(async (id: string) => {
        console.log('requesting drop with ID: ', id);
    });

program.parse();

const exitSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

for (const signal in exitSignals)
    process.on(signal, async (code) => {
        console.log('PROGRAM EXITING');
    });
