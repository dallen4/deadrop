import React, { useEffect, useMemo, useRef } from 'react';
import {
  grabMachine,
  initGrabContext,
} from '@shared/lib/machines/grab';
import { useMachine } from '@xstate/react';
import type { GrabContext } from '@shared/types/grab';
import { GrabState } from '@shared/lib/constants';
import { useRouter } from 'next/router';
import { decryptFile, hashFile } from 'lib/crypto';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons';
import { createGrabHandlers } from '@shared/handlers/grab';
import { cleanupSession } from 'lib/session';
import { initPeer } from 'lib/peer';

export const useGrab = () => {
  const router = useRouter();

  const logsRef = useRef<Array<string>>([]);
  const contextRef = useRef<GrabContext>(initGrabContext());

  const [{ value: state }, send] = useMachine(grabMachine);

  useEffect(() => {
    const onLeaveAttempt = () => {
      throw 'Cannot navigate away, peer active';
    };

    if (state === GrabState.Ready) {
      router.events.on('routeChangeStart', onLeaveAttempt);
    } else if (
      [GrabState.Completed, GrabState.Error].includes(
        state as GrabState,
      )
    ) {
      router.events.off('routeChangeStart', onLeaveAttempt);
    }

    return () => {
      router.events.off('routeChangeStart', onLeaveAttempt);
    };
  }, [state]);

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
        apiUri: process.env.NEXT_PUBLIC_DEADROP_API_URL!,
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
    contextRef.current.id = router.query.drop as string;

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
