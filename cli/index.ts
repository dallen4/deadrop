#!/usr/bin/env node
import 'dotenv/config';
import { deadrop } from 'core';
import { checkNodeVersion } from 'lib/util';

checkNodeVersion();

deadrop.parse();

const exitSignals: NodeJS.Signals[] = [
  'SIGINT',
  'SIGTERM',
  'SIGQUIT',
];

for (const signal in exitSignals)
  process.on(signal, async (code) => {
    console.log('PROGRAM EXITING');
    process.exit(1);
  });
