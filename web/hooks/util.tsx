import React, { useEffect, useRef } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons';
import { useRouter } from 'next/router';
import { StateValue } from 'xstate';
import { encryptFile, decryptFile, hashFile } from 'lib/crypto';
import { initPeer } from 'lib/peer';
import { cleanupSession } from 'lib/session';

const onRetryExceeded = () => {
  showNotification({
    message: 'Connection may be unstable, please try again',
    color: 'red',
    icon: <IconX />,
    autoClose: 4500,
  });
};

export const handlerOptions = {
  file: {
    encrypt: encryptFile,
    decrypt: decryptFile,
    hash: hashFile,
  },
  initPeer,
  cleanupSession,
  onRetryExceeded,
};

export const useLogger = () => {
  const logsRef = useRef<Array<string>>([]);

  const pushLog = (message: string) => logsRef.current.push(message);
  const getLogs = () => logsRef.current;

  return {
    pushLog,
    getLogs,
    logger: {
      info: pushLog,
      error: console.error,
      debug: console.log,
    },
  };
};

export const useNavigationProtection = (
  state: StateValue,
  activateState: string,
  disabledStates: string[],
) => {
  const router = useRouter();

  useEffect(() => {
    const onLeaveAttempt = () => {
      throw 'Cannot navigate away, peer active';
    };

    if (state === activateState) {
      router.events.on('routeChangeStart', onLeaveAttempt);
    } else if (disabledStates.includes(state as string)) {
      router.events.off('routeChangeStart', onLeaveAttempt);
    }

    return () => {
      router.events.off('routeChangeStart', onLeaveAttempt);
    };
  }, [state, activateState, disabledStates]);
};

export const showError = (message: string) => {
  showNotification({
    message,
    color: 'red',
    icon: <IconX />,
    autoClose: 2000,
  });
};
