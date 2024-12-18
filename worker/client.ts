import { hc, ClientRequestOptions } from 'hono/client';
import { DeadropWorkerApi } from './src/app';

export const createClient = (
  url: string,
  options?: ClientRequestOptions,
) => hc<DeadropWorkerApi>(url, options);

export type DeadropApiClient = ReturnType<typeof createClient>;
