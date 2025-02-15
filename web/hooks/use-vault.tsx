import { useCallback, useEffect, useState } from 'react';
import { DeadropConfig } from '@shared/types/config';
import { DeadropMessage } from 'types/worker';
import { useServiceWorker } from 'contexts/SWContext';
import { showNotification } from '@mantine/notifications';

export const useVault = () => {
  const [config, setConfig] = useState<DeadropConfig | null>(null);
  const [secrets, setSecrets] = useState<string[]>([]);
  const {
    activateWorker,
    sendMessage,
    addMessageHandler,
    removeMessageHandler,
  } = useServiceWorker();

  const onMessage = useCallback((message: DeadropMessage) => {
    if (message.type === 'config') {
      setConfig(message.payload);

      showNotification({ message: 'Config loaded!' });
    } else if (message.type === 'all_secrets') {
      setSecrets(message.payload);

      showNotification({
        message: `Secrets loaded for '${config!.active_vault.environment}'`,
      });
    }
  }, []);

  useEffect(() => {
    activateWorker().then(() => {
      console.log('Worker registered!');

      addMessageHandler(onMessage);

      console.log('Message handler mounted!');

      sendMessage({ type: 'get_config' });
      sendMessage({
        type: 'add_secret',
        payload: {
          name: 'NODE_ENV',
          environment: '',
          value: '',
        },
      });
    });

    return () => {
      removeMessageHandler(onMessage);
    };
  }, []);

  return { config, sendMessage, secrets };
};
