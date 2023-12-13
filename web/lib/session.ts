import { DropContext } from '@shared/types/drop';
import { GrabContext } from '@shared/types/grab';

export const cleanupSession = async (ctx: DropContext | GrabContext) => {
    const { removeOnUnloadListener } = await import('@shared/lib/peer');

    if (ctx.connection?.open) ctx.connection!.close();

    ctx.peer?.disconnect();
    ctx.peer?.destroy();

    removeOnUnloadListener();
};
