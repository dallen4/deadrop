#!/usr/bin/env node

import { Command } from 'commander';
import { version } from './package.json';
import { nanoid } from 'nanoid';
import chalk from 'chalk';
import figlet from 'figlet';
import inquirer from 'inquirer';
const program = new Command();

program.name('deaddrop-cli').description('description').version(version);

program
    .command('drop')
    .argument('[input]', 'secret to drop')
    .option('-i, --input [input]', 'secret to drop')
    .option('-t, --type [dropType]', 'type of secret being dropped')
    .action((input: string | undefined, options) => {
        console.log(
            chalk.green(
                figlet.textSync('deaddrop', {
                    font: 'Standard',
                    horizontalLayout: 'default',
                    verticalLayout: 'default',
                }),
            ),
        );
        if (input) console.log('input arg provided: ', input);
        else console.log('input option provided: ', options.input);
    });

program
    .command('grab')
    .argument('<id>', 'drop session ID')
    .action((id: string) => {
        console.log('requesting drop with ID: ', id);
    });

program.parse();
