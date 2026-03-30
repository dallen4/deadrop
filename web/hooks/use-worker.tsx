import { showNotification } from '@mantine/notifications';
import { useCallback, useEffect, useState } from 'react';
import { DeadropMessage } from 'types/worker';

type MessageHandler = (msg: DeadropMessage) => void;

export const useServiceWorkerMessaging = ({
  onMessage,
}: {
  onMessage: MessageHandler;
}) => {
  const [error, setError] = useState<string | null>(null);

  const activateServiceWorker = async () => {
    if (
      'serviceWorker' in navigator &&
      window.workbox !== undefined &&
      !navigator.serviceWorker.controller
    ) {
      window.workbox.register();
    }
  };

  const sendMessage = useCallback((message: DeadropMessage) => {
    if (!navigator.serviceWorker.controller) {
      setError('No active Service Worker controller found.');
      return;
    }

    navigator.serviceWorker.controller.postMessage(message);
  }, []);

  useEffect(() => {
    const callback = (message: MessageEvent<DeadropMessage>) => {
      if (message.data.type === 'notification') {
        const { message: msg, variant } = message.data.payload;

        showNotification({
          message: msg,
          color: variant === 'error' ? 'red' : undefined,
        });
      }

      onMessage(message.data);
    };

    navigator.serviceWorker.addEventListener('message', callback);

    return () => {
      navigator.serviceWorker.removeEventListener(
        'message',
        callback,
      );
    };
  }, []);

  return { activateServiceWorker, sendMessage, error };
};
