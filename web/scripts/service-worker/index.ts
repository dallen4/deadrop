/// <reference lib="webworker" />
import { initConfig } from '../../../shared/lib/vault';
import {
  CONFIG_FILE_NAME,
  DEFAULT_VAULT_NAME,
} from '../../../shared/lib/constants';
import type { DeadropConfig } from '../../../shared/types/config';
import { createSecretsHelpers } from '../../../shared/db/secrets';
import { initDBClient } from '../../lib/db';
import {
  DeadropMessage,
  DeadropServiceWorkerMessage,
} from 'types/worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const randomBase64 = () => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...randomBytes));
};

async function processMessage(
  message: DeadropMessage,
): Promise<DeadropMessage | undefined> {
  const directoryHandler = await navigator.storage.getDirectory();
  const fileHandler = await directoryHandler.getFileHandle(
    CONFIG_FILE_NAME,
    { create: true },
  );

  let writeableStream: FileSystemWritableFileStream | undefined;

  const writeConfig = async (updatedConfig: DeadropConfig) => {
    writeableStream = await fileHandler.createWritable();
    await writeableStream.write(JSON.stringify(updatedConfig));
  };

  let config: DeadropConfig;

  try {
    const configFile = await fileHandler.getFile();
    const configString = await configFile.text();

    config = JSON.parse(configString);
  } catch (err) {
    // if not found, create config & init secret
    config = await initConfig(DEFAULT_VAULT_NAME, randomBase64());

    await writeConfig(config);
  }

  if (message.type === 'get_config')
    return { type: 'config', payload: config };

  let response: DeadropMessage | undefined;

  if (message.type === 'set_config') {
    await writeConfig(message.payload);

    response = {
      type: 'notification',
      payload: {
        variant: 'success',
        message: 'deadrop config updated!',
      },
    };
  } else if (message.type.includes('secret')) {
    const activeVault = config.vaults[config.active_vault.name];

    const db = await initDBClient(
      activeVault.location,
      activeVault.key,
      activeVault.cloud,
    );

    const { addSecrets, updateSecret, getSecret, getAllSecrets } =
      createSecretsHelpers(activeVault, db);

    if (message.type === 'add_secret') {
      await addSecrets([message.payload]);

      response = {
        type: 'notification',
        payload: {
          variant: 'success',
          message: 'secret added to vault!',
        },
      };
    } else if (message.type === 'update_secret') {
      await updateSecret(message.payload);

      response = {
        type: 'notification',
        payload: {
          variant: 'success',
          message: 'secret updated in vault!',
        },
      };
    } else if (message.type === 'get_secret') {
      const { name, environment } = message.payload;

      const secretValue = await getSecret(name, environment);

      response = {
        type: 'secret',
        payload: {
          name,
          value: secretValue,
          environment,
        },
      };
    } else if (message.type === 'get_secrets') {
      const { environment } = message.payload;

      const secretsMap = await getAllSecrets(environment);

      response = {
        type: 'all_secrets',
        payload: Object.keys(secretsMap),
      };
    }
  }

  if (writeableStream) await writeableStream.close();

  return response;
}

sw.addEventListener(
  'message',
  async (msg: DeadropServiceWorkerMessage) => {
    console.log('Message received, processing...');
    const response = await processMessage(msg.data);
    console.log('Message processed...');

    if (response) {
      console.log('Sending response...');
      msg.source?.postMessage(response);
      console.log('Response sent!');
    }
  },
);
