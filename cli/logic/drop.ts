import { createDropHandlers } from '@shared/handlers/drop';
import { dropMachine } from '@shared/lib/machines/drop';
import { AnyDropEvent, DropContext } from '@shared/types/drop';
import chalk from 'chalk';
import { encryptFile, hashFile } from 'lib/crypto';
import { loader, logDebug, logError, logInfo } from 'lib/log';
import { initPeer } from 'lib/peer';
import { cleanupSession } from 'lib/session';
import { generateGrabUrl } from 'lib/util';
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
    apiUri: process.env.DEADDROP_API_URL!,
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
