import { hc, ClientRequestOptions } from 'hono/client';
import { DeadropWorkerApi } from './app';

export const createClient = (
  url: string,
  options?: ClientRequestOptions,
) => hc<DeadropWorkerApi>(url, options);
