import {
  grabMachine,
  initGrabContext,
} from '@shared/lib/machines/grab';
import { useMachine } from '@xstate/react';
import type { GrabContext } from '@shared/types/grab';
import { GrabState } from '@shared/lib/constants';
import { useMemo, useRef } from 'react';
import { useBlocker, useSearchParams } from 'react-router';
import { decryptFile, hashFile } from 'lib/crypto';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons-react';
import { createGrabHandlers } from '@shared/handlers/grab';
import { cleanupSession } from 'lib/session';
import { initPeer } from 'lib/peer';

export const useGrab = () => {
  const [searchParams] = useSearchParams();
  const logsRef = useRef<Array<string>>([]);
  const contextRef = useRef<GrabContext>(initGrabContext());

  const [{ value: state }, send] = useMachine(grabMachine);

  // Block navigation when in Ready state
  useBlocker(() => {
    return state === GrabState.Ready;
  });

  const pushLog = (message: string) => logsRef.current.push(message);

  const onRetryExceeded = () => {
    showNotification({
      message: 'Connection may be unstable, please try again',
      color: 'red',
      icon: <IconX />,
      autoClose: 4500,
    });
  };

  const { init: baseInit } = useMemo(
    () =>
      createGrabHandlers<File>({
        ctx: contextRef.current,
        sendEvent: send,
        logger: {
          info: pushLog,
          error: console.error,
          debug: console.log,
        },
        file: {
          decrypt: decryptFile,
          hash: hashFile,
        },
        apiUri: import.meta.env.VITE_DEADROP_API_URL!,
        initPeer,
        cleanupSession,
        onRetryExceeded,
      }),
    [],
  );

  const getLogs = () => logsRef.current;

  const getMode = () => contextRef.current.mode;

  const getSecret = () => contextRef.current.message;

  const init = async () => {
    contextRef.current.id = searchParams.get('drop') as string;

    await baseInit();
  };

  return {
    init,
    status: state as GrabState,
    getLogs,
    getMode,
    getSecret,
  };
};
