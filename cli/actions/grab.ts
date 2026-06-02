import { createGrabHandlers } from '@shared/handlers/grab';
import {
  grabMachine,
  initGrabContext,
} from '@shared/lib/machines/grab';
import { GrabEventType } from '@shared/lib/constants';
import { DropContext } from '@shared/types/drop';
import { AnyGrabEvent, GrabContext } from '@shared/types/grab';
import { decryptFile, hashFile } from 'lib/crypto';
import {
  displayWelcomeMessage,
  logDebug,
  logError,
  logInfo,
} from 'lib/log';
import { initPeer } from 'lib/peer';
import { cleanupSession } from 'lib/session';

export const grab = async (id: string) => {
  const ctx = initGrabContext();

  let currState = grabMachine.initialState;

  // The handler emits Confirm once the secret is received and its integrity
  // is verified, and Failure when validation fails. Track that so cleanup can
  // exit with a meaningful code.
  let succeeded = false;

  const sendEvent = (event: AnyGrabEvent) => {
    if (event.type === GrabEventType.Confirm) succeeded = true;
    else if (event.type === GrabEventType.Failure) succeeded = false;

    currState = grabMachine.transition(currState, event);
    return currState;
  };

  const cleanup = (ctx: GrabContext | DropContext) => {
    cleanupSession(ctx);
    // Exit 0 only on a verified grab. Every other teardown path (validation
    // failed, drop not found, connection/init errors) never emits Confirm, so
    // it exits non-zero.
    process.exit(succeeded ? 0 : 1);
  };

  ctx.id = id;

  displayWelcomeMessage();

  const { init } = createGrabHandlers({
    ctx,
    sendEvent,
    logger: {
      info: logInfo,
      error: logError,
      debug: logDebug,
    },
    file: {
      decrypt: decryptFile,
      hash: hashFile,
    },
    initPeer,
    cleanupSession: cleanup,
    apiUri: process.env.DEADROP_API_URL!,
  });

  await init();
};
