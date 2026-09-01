#!/usr/bin/env node
import './scripts/bun-inject';
import 'dotenv/config';
import { deadrop } from 'core';
import { checkNodeVersion, checkBunVersion } from 'lib/util';
import { migrateLegacyCreds } from 'lib/auth/cache';
import { logDebug } from 'lib/log';

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
  process.on(signal, () => {
    logDebug('PROGRAM EXITING');
    process.exit(1);
  });
