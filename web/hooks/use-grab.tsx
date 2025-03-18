import React, { useRef } from 'react';
import {
  grabMachine,
  initGrabContext,
} from '@shared/lib/machines/grab';
import { useMachine } from '@xstate/react';
import type { GrabContext } from '@shared/types/grab';
import { GrabState } from '@shared/lib/constants';
import { useRouter } from 'next/router';
import { createGrabHandlers } from '@shared/handlers/grab';

import { useHandlers } from './use-handlers';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons';

export const useGrab = () => {
  const router = useRouter();

  const contextRef = useRef<GrabContext>(initGrabContext());

  const [{ value: state }, send] = useMachine(grabMachine);

  const { init: baseInit, getLogs } = useHandlers(
    createGrabHandlers,
    contextRef.current,
    send,
    state,
    {
      activateState: GrabState.Ready,
      disabledStates: [GrabState.Completed, GrabState.Error],
    }
  );

  const getMode = () => contextRef.current.mode;

  const getSecret = () => contextRef.current.message;

  const init = async () => {
    contextRef.current.id = router.query.drop as string;

    try {
      await baseInit();
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

  return {
    init,
    status: state as GrabState,
    getLogs,
    getMode,
    getSecret,
  };
};
