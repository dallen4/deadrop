import React from 'react';
import {
  grabMachine,
  initGrabContext,
} from '@shared/lib/machines/grab';
import type { AnyGrabEvent, GrabContext } from '@shared/types/grab';
import { GrabState } from '@shared/lib/constants';
import { useRouter } from 'next/router';
import {
  createGrabHandlers,
  GrabHandlers,
} from '@shared/handlers/grab';
import { useHandlers } from './use-handlers';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons';
import { useNavigationProtection } from './util';

export const useGrab = () => {
  const router = useRouter();

  const {
    init: baseInit,
    getLogs,
    state,
    context,
  } = useHandlers<GrabContext, AnyGrabEvent, GrabHandlers>(
    createGrabHandlers,
    grabMachine,
    initGrabContext,
  );

  useNavigationProtection(state, GrabState.Ready, [
    GrabState.Completed,
    GrabState.Error,
  ]);

  const getMode = () => context.mode;

  const getSecret = () => context.message;

  const init = async () => {
    context.id = router.query.drop as string;

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
