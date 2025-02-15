import { ClientRequestOptions, hc } from 'hono/client';
import { DeadropWorkerApi } from '@api/client';

export const createClient = (
  url: string,
  options?: ClientRequestOptions,
) =>
  hc<DeadropWorkerApi>(url, {
    ...options,
    init: {
      credentials: 'include',
      ...options?.init,
    },
  });

export type DeadropApiClient = ReturnType<typeof createClient>;
