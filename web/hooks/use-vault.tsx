import { useCallback, useEffect, useState } from 'react';
import { DeadropConfig } from '@shared/types/config';
import { DeadropMessage } from 'types/worker';
import { useServiceWorker } from 'contexts/SWContext';
import { showNotification } from '@mantine/notifications';

export const useVault = () => {
  const [config, setConfig] = useState<DeadropConfig | null>(null);
  const {
    activateWorker,
    sendMessage,
    addMessageHandler,
    removeMessageHandler,
  } = useServiceWorker();

  const onMessage = useCallback((message: DeadropMessage) => {
    console.log('RECEIVED', message);
    if (message.type === 'config') {
      setConfig(message.payload);

      showNotification({ message: 'Config loaded!' });
    }
  }, []);

  useEffect(() => {
    console.log('registering');
    activateWorker().then(() => {
      console.log('registered');
      addMessageHandler(onMessage);
    });

    return () => {
      removeMessageHandler(onMessage);
    };
  }, []);

  return { config, sendMessage };
};
