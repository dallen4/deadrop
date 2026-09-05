import { createClient, DeadropApiClient } from '@shared/client';
import { useApiHeaders } from './api-headers';
import { DEADROP_API_URL } from 'src/env';
import { AuthScopes } from '@shared/lib/constants';
import { useRef } from 'react';

export async function useApiKeys() {
  const getApiHeaders = useApiHeaders();
  const clientRef = useRef<DeadropApiClient>(null);

  const initClient = async () => {
    if (clientRef.current) return clientRef.current;

    return (clientRef.current = createClient(DEADROP_API_URL, {
      init: { headers: await getApiHeaders() },
    }));
  };

  const listApiKeys = async (claims: {
    vaultName: string;
    environment: string;
  }) => {
    const client = await initClient();

    const listApiKeysResponse = await client.auth.keys.$get({
      query: {
        scopes: [AuthScopes.VaultInject],
        ...claims,
      },
    });

    return listApiKeysResponse.json();
  };

  const createApiKey = async (claims: {
    vaultName: string;
    environment: string;
  }) => {
    const client = await initClient();

    const apiKeysResponse = await client.auth.keys.$post({
      json: claims,
    });

    return apiKeysResponse.json();
  };

  return { listApiKeys, createApiKey };
}
