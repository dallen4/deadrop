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
import { showError, useNavigationProtection } from './util';

export const useGrab = () => {
  const router = useRouter();

  const {
    init: baseInit,
    getLogs,
    state,
    context,
  } = useHandlers<GrabHandlers, GrabContext, AnyGrabEvent>(
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
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to initialize grab';

      showError(message);
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
