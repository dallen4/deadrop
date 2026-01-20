import type { AnyDropEvent, DropContext } from '@shared/types/drop';
import {
  dropMachine,
  initDropContext,
} from '@shared/lib/machines/drop';
import { DropState } from '@shared/lib/constants';
import { generateGrabUrl } from 'lib/util';
import {
  createDropHandlers,
  DropHandlers,
} from '@shared/handlers/drop';
import { useHandlers } from './use-handlers';
import { showError, useNavigationProtection } from './util';

export const useDrop = () => {
  const {
    init: initDrop,
    stagePayload,
    startHandshake,
    drop,
    getLogs,
    state,
    context,
  } = useHandlers<DropHandlers, DropContext, AnyDropEvent>(
    createDropHandlers,
    dropMachine,
    initDropContext,
  );

  useNavigationProtection(state, DropState.Ready, [
    DropState.Completed,
    DropState.Error,
  ]);

  const init = async () => {
    try {
      await initDrop();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to initialize drop';

      showError(message);
    }
  };

  const dropLink = () => {
    const dropId = context.id!;
    return typeof window !== 'undefined'
      ? generateGrabUrl(dropId)
      : undefined;
  };

  return {
    init,
    setPayload: stagePayload,
    dropLink,
    startHandshake,
    drop,
    getLogs,
    status: state as DropState,
  };
};
