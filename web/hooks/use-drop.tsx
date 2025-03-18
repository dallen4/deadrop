import React, { useRef } from 'react';
import type { DropContext } from '@shared/types/drop';
import { useMachine } from '@xstate/react';
import {
  dropMachine,
  initDropContext,
} from '@shared/lib/machines/drop';
import { DropState } from '@shared/lib/constants';
import { generateGrabUrl } from 'lib/util';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons';
import { createDropHandlers } from '@shared/handlers/drop';

import { useHandlers } from './use-handlers';

export const useDrop = () => {
  const contextRef = useRef<DropContext>(initDropContext());

  const [{ value: state }, send] = useMachine(dropMachine);

  const {
    init: initDrop,
    stagePayload,
    startHandshake,
    drop,
    getLogs,
  } = useHandlers(
    createDropHandlers,
    contextRef.current,
    send,
    state,
    {
      activateState: DropState.Ready,
      disabledStates: [DropState.Completed, DropState.Error],
    }
  );

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
    const dropId = contextRef.current.id!;
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
