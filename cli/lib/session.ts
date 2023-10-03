import { DropContext } from '@shared/types/drop';
import { GrabContext } from '@shared/types/grab';

export const cleanup = (ctx: DropContext | GrabContext) => {
    if (ctx.connection?.open) ctx.connection!.close();

    ctx.peer?.disconnect();
    ctx.peer?.destroy();
};
