import React from 'react';
import type { AnyDropEvent, DropContext } from '@shared/types/drop';
import {
  dropMachine,
  initDropContext,
} from '@shared/lib/machines/drop';
import { DropState } from '@shared/lib/constants';
import { generateGrabUrl } from 'lib/util';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons';
import {
  createDropHandlers,
  DropHandlers,
} from '@shared/handlers/drop';
import { useHandlers } from './use-handlers';
import { useNavigationProtection } from './util';

export const useDrop = () => {
  const {
    init: initDrop,
    stagePayload,
    startHandshake,
    drop,
    getLogs,
    state,
    context,
  } = useHandlers<DropContext, AnyDropEvent, DropHandlers>(
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
      console.error(err);
      showNotification({
        message: (err as Error).message,
        color: 'red',
        icon: <IconX />,
        autoClose: 2000,
      });
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
