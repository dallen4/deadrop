import { createClient } from '@shared/client';
import { useApiHeaders } from './api-headers';
import { DEADROP_API_URL } from '../env';
import { AuthScopes } from '@shared/lib/constants';
import { useCallback } from 'react';

export type VaultApiKeyTarget = {
  vaultName: string;
  environment: string;
};

export const useApiKeys = () => {
  const getApiHeaders = useApiHeaders();

  // Clerk session tokens are short-lived, so headers are resolved per
  // call rather than baked into a cached client.
  const initClient = useCallback(
    async () =>
      createClient(DEADROP_API_URL, {
        init: { headers: await getApiHeaders() },
      }),
    [getApiHeaders],
  );

  const listApiKeys = useCallback(
    async (target: VaultApiKeyTarget) => {
      const client = await initClient();

      const response = await client.auth.keys.$get({
        query: {
          scopes: [AuthScopes.VaultInject],
          ...target,
        },
      });

      if (!response.ok)
        throw new Error('Could not load API keys for this vault.');

      return response.json();
    },
    [initClient],
  );

  const createApiKey = useCallback(
    async (target: VaultApiKeyTarget) => {
      const client = await initClient();

      const response = await client.auth.keys.$post({
        json: target,
      });

      if (response.status !== 201)
        throw new Error('Could not issue an API key for this vault.');

      return response.json();
    },
    [initClient],
  );

  return { listApiKeys, createApiKey };
};
