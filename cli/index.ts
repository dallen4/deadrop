#!/usr/bin/env node

import { Command } from 'commander';
// import { version } from './package.json';

const program = new Command();

program
    .name('deaddrop-cli')
    .description('description')
    .version('1')
    .option('-i, --input', 'drop input')
    .parse(process.argv);

const options = program.opts();
console.log(options);