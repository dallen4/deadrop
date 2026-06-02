import { createDropHandlers } from '@shared/handlers/drop';
import { dropMachine } from '@shared/lib/machines/drop';
import { AnyDropEvent, DropContext } from '@shared/types/drop';
import chalk from 'chalk';
import { encryptFile, hashFile } from 'lib/crypto';
import { loader, logDebug, logError, logInfo } from 'lib/log';
import { initPeer } from 'lib/peer';
import { cleanupSession } from 'lib/session';
import { generateGrabUrl } from 'lib/util';
import { TEST_TOKEN_COOKIE } from '@shared/tests/http';
import QRCode from 'qrcode';

export async function dropSecret(ctx: DropContext) {
  let currState = dropMachine.initialState;

  const sendEvent = (event: AnyDropEvent) => {
    currState = dropMachine.transition(currState, event);
    return currState;
  };

  const { init, stagePayload } = createDropHandlers({
    ctx,
    sendEvent,
    logger: {
      info: logInfo,
      error: logError,
      debug: logDebug,
    },
    file: {
      encrypt: (...args) =>
        encryptFile(...args).then((res) => res.data),
      hash: hashFile,
    },
    cleanupSession,
    apiUri: process.env.DEADROP_API_URL!,
    // e2e only: ride the drop-token bypass past captcha/rate-limits. A cookie
    // is just a request header, and Node/Bun fetch both send a manually-set
    // Cookie, so we set it directly (no cookie jar needed) and the worker's
    // existing getCookie path accepts it. Unset in normal use, so this is a
    // no-op in production.
    apiHeaders: process.env.TEST_TOKEN
      ? {
          Cookie: `${TEST_TOKEN_COOKIE}=${process.env.TEST_TOKEN}`,
        }
      : undefined,
    initPeer,
  });

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
}
