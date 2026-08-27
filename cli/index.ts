#!/usr/bin/env node
import './scripts/bun-inject';
import 'dotenv/config';
import { deadrop } from 'core';
import { checkNodeVersion, checkBunVersion } from 'lib/util';
import { migrateLegacyCreds } from 'lib/auth/cache';

checkBunVersion();
checkNodeVersion();
migrateLegacyCreds();

deadrop.parse();

const exitSignals: NodeJS.Signals[] = [
  'SIGINT',
  'SIGTERM',
  'SIGQUIT',
];

// `in` iterated array indices, so these bound to "0"/"1"/"2" and never fired
for (const signal of exitSignals)
  process.on(signal, async (code) => {
    console.log('PROGRAM EXITING');
    process.exit(1);
  });
