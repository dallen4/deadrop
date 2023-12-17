import { DropContext } from '@shared/types/drop';
import { GrabContext } from '@shared/types/grab';
import { cleanupSession as baseCleanup } from '@shared/lib/util';

export const cleanupSession = async (ctx: DropContext | GrabContext) => {
  baseCleanup(ctx);

  process.exit(0);
};
