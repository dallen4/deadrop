import { removeOnUnloadListener } from './peer';
import type { DropContext } from '../types/drop';
import type { GrabContext } from '../types/grab';

// Tears down an active peer session (connection + peer) and removes the
// beforeunload guard. Identical across platforms, so it lives in shared
// rather than being duplicated per platform adapter.
export const cleanupSession = (ctx: DropContext | GrabContext) => {
  if (ctx.connection?.open) ctx.connection.close();

  ctx.peer?.disconnect();
  ctx.peer?.destroy();

  removeOnUnloadListener();
};
