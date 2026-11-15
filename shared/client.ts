import { ClientRequestOptions, hc } from 'hono/client';
import { DeadropWorkerApi } from '@api/client';

// hono spreads `init` over the headers it builds, so `init.headers` would
// drop `Content-Type: application/json` and the worker would validate an
// empty body. Lift them into `headers`, which hono merges instead.
const liftInitHeaders = (
  options?: ClientRequestOptions,
): ClientRequestOptions['headers'] => {
  const initHeaders = options?.init?.headers;
  if (!initHeaders) return options?.headers;

  const lifted = Object.fromEntries(new Headers(initHeaders));
  const own = options?.headers;

  return typeof own === 'function'
    ? async () => ({ ...lifted, ...(await own()) })
    : { ...lifted, ...own };
};

export const createClient = (
  url: string,
  options?: ClientRequestOptions,
) => {
  const { headers: _dropped, ...init } = options?.init ?? {};

  return hc<DeadropWorkerApi>(url, {
    ...options,
    headers: liftInitHeaders(options),
    init: {
      credentials: 'include',
      ...init,
    },
  });
};

export type DeadropApiClient = ReturnType<typeof createClient>;
