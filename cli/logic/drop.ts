import { createDropHandlers } from '@shared/handlers/drop';
import { dropMachine } from '@shared/lib/machines/drop';
import { DropEventType, DropState } from '@shared/lib/constants';
import { AnyDropEvent, DropContext } from '@shared/types/drop';
import chalk from 'chalk';
import { encryptFile, hashFile } from 'lib/crypto';
import {
  loader,
  logDebug,
  logError,
  logInfo,
  printGrabberList,
  resetGrabberList,
} from 'lib/log';
import { initPeer } from 'lib/peer';
import { cleanupSession } from 'lib/session';
import { generateGrabUrl } from 'lib/util';
import { TEST_TOKEN_HEADER } from '@shared/tests/http';
import QRCode from 'qrcode';

const GRABBER_EVENT_TYPES = new Set<DropEventType>([
  DropEventType.GrabberConnected,
  DropEventType.GrabberProgress,
  DropEventType.GrabberConfirmed,
  DropEventType.GrabberFailed,
  DropEventType.StopAccepting,
]);

// wraps the machine transition with a live re-render of the grabber list
// and resolves once the session reaches Completed (cap hit, stop, or TTL)
export const createSendEvent = (
  ctx: DropContext,
  onCompleted: () => void,
) => {
  let currState = dropMachine.initialState;

  return (event: AnyDropEvent) => {
    currState = dropMachine.transition(currState, event);

    if (GRABBER_EVENT_TYPES.has(event.type as DropEventType))
      printGrabberList(ctx.grabbers, ctx.maxGrabbers);

    if (currState.matches(DropState.Completed)) onCompleted();

    return currState;
  };
};

// any keypress or Ctrl-C stops accepting new grabbers; injectable stdin
// and process for testing
export const listenForStopKey = (
  onStop: () => void,
  stdin: NodeJS.ReadStream = process.stdin,
  proc: NodeJS.Process = process,
) => {
  let triggered = false;

  const trigger = () => {
    if (triggered) return;

    triggered = true;
    onStop();
  };

  const isTTY = !!stdin.isTTY;

  if (isTTY) {
    stdin.setRawMode!(true);
    stdin.resume();
  }

  stdin.on('data', trigger);
  proc.on('SIGINT', trigger);

  return () => {
    stdin.removeListener('data', trigger);
    proc.removeListener('SIGINT', trigger);

    if (isTTY) {
      stdin.setRawMode!(false);
      stdin.pause();
    }
  };
};

export async function dropSecret(
  ctx: DropContext,
  token?: string | null,
) {
  let resolveCompletion: () => void;

  const completion = new Promise<void>((resolve) => {
    resolveCompletion = resolve;
  });

  const sendEvent = createSendEvent(ctx, () => resolveCompletion());

  const { init, stagePayload, startSession, stopAccepting } =
    createDropHandlers({
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
      apiHeaders: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // e2e: the worker's test-token bypass
        ...(process.env.TEST_TOKEN
          ? { [TEST_TOKEN_HEADER]: process.env.TEST_TOKEN }
          : {}),
      },
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

  await startSession();

  logInfo('Press any key to stop accepting new grabbers...');

  resetGrabberList();
  printGrabberList(ctx.grabbers, ctx.maxGrabbers);

  const stopListening = listenForStopKey(stopAccepting);

  await completion;

  stopListening();

  logInfo('Drop session complete!');
}
