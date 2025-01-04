import { createGrabHandlers } from '@shared/handlers/grab';
import {
  grabMachine,
  initGrabContext,
} from '@shared/lib/machines/grab';
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

  const sendEvent = (event: AnyGrabEvent) => {
    currState = grabMachine.transition(currState, event);
    return currState;
  };

  const cleanup = (ctx: GrabContext | DropContext) => {
    cleanupSession(ctx);
    process.exit(1);
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
