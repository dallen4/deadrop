import type { DropContext } from '@shared/types/drop';
import type { GrabContext } from '@shared/types/grab';
import { removeOnUnloadListener } from '@shared/lib/peer';

export const cleanupSession = (ctx: DropContext | GrabContext) => {
  if (ctx.connection?.open) ctx.connection.close();

  ctx.peer?.disconnect();
  ctx.peer?.destroy();

  removeOnUnloadListener();
};
