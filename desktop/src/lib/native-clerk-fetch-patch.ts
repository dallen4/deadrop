import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Tauri's webview auto-attaches an `Origin` header to every fetch, and
// Clerk's backend rejects requests carrying both `Origin` and
// `Authorization` (`origin_authorization_headers_conflict`). Routing
// Clerk's FAPI calls through `@tauri-apps/plugin-http` instead of the
// webview's native fetch avoids that — Rust-side HTTP requests aren't
// webview-originated, so no Origin gets attached automatically.
//
// `Origin` is a forbidden header name per the Fetch spec, so it can't be
// set (or unset) through the standard `Headers`/`Request` API — the only
// way to control it is to reach around `@tauri-apps/plugin-http`'s public
// `fetch()` and patch the raw IPC payload it sends to Rust before
// `tauri-plugin-http`'s `unsafe-headers` feature (already enabled,
// desktop/src-tauri/Cargo.toml) lets Rust honor the caller-supplied value.
//
// Ported from tauri-plugin-clerk's guest-js/patching.ts (MIT, Nipsuli/tauri-plugin-clerk)
// — we dropped that plugin for its clerk-fapi-rs dependency (incomplete
// OAuth-strategy enums broke Clerk client loading entirely), but this specific
// technique is unrelated to clerk-fapi-rs and still the correct fix for the
// underlying Tauri networking constraint.

const realFetch = globalThis.fetch;

type Fetch = typeof realFetch;
type FetchArgs = Parameters<Fetch>;
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

const CLERK_FETCH_HEADER = 'x-tauri-fetch';
const NO_ORIGIN_HEADER = 'x-no-origin';

const shouldRunTauriFetch = (
  input: FetchArgs[0],
  init: FetchArgs[1],
): boolean => {
  const headers = init?.headers;
  if (headers instanceof Headers) return headers.has(CLERK_FETCH_HEADER);
  if (Array.isArray(headers)) {
    return headers.some(([key]) => key === CLERK_FETCH_HEADER);
  }
  if (headers && typeof headers === 'object') {
    return CLERK_FETCH_HEADER in headers;
  }
  if (input instanceof Request) return input.headers.has(CLERK_FETCH_HEADER);
  return false;
};

const parseTauriFetchBody = (
  obj: Json,
): { clientConfig: { [key: string]: Json } } => {
  if (
    obj &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    'clientConfig' in obj &&
    typeof obj.clientConfig === 'object' &&
    obj.clientConfig !== null &&
    !Array.isArray(obj.clientConfig)
  ) {
    return obj as { clientConfig: { [key: string]: Json } };
  }
  throw new Error('Invalid Tauri fetch body: no clientConfig');
};

const getHeadersFromTauriFetchBody = (body: {
  clientConfig: { [key: string]: Json };
}): [string, string][] => {
  const { headers } = body.clientConfig;
  if (
    Array.isArray(headers) &&
    headers.every(
      (h): h is [string, string] =>
        Array.isArray(h) &&
        h.length === 2 &&
        typeof h[0] === 'string' &&
        typeof h[1] === 'string',
    )
  ) {
    return headers;
  }
  throw new Error('Invalid Tauri fetch body: no headers');
};

// Patches the outgoing IPC call to Rust's plugin:http|fetch command, so we
// can inject an Origin header value the JS Headers API would otherwise
// refuse to set.
const runRealFetch = async (
  input: FetchArgs[0],
  init: FetchArgs[1],
): ReturnType<Fetch> => {
  const url =
    typeof input === 'string'
      ? new URL(input)
      : input instanceof URL
        ? input
        : new URL(input.url);
  const isPluginHttpFetch =
    decodeURIComponent(url.pathname) === '/plugin:http|fetch';

  let initToPass = init;

  if (isPluginHttpFetch && typeof init?.body === 'string') {
    const rawBody = JSON.parse(init.body) as Json;
    const body = parseTauriFetchBody(rawBody);
    const existingHeaders = getHeadersFromTauriFetchBody(body);

    const headers: [string, string][] = [
      ...existingHeaders,
      ['User-Agent', window.navigator.userAgent],
      existingHeaders.some(([key]) => key === NO_ORIGIN_HEADER)
        ? ['Origin', '']
        : ['Origin', window.location.origin],
    ];

    initToPass = {
      ...init,
      body: JSON.stringify({
        body,
        clientConfig: { ...body.clientConfig, headers },
      }),
    };
  }

  return realFetch(input, initToPass);
};

let patched = false;

export const applyNativeFetchPatch = (): void => {
  if (patched) return;
  patched = true;
  globalThis.fetch = async (input, init) =>
    shouldRunTauriFetch(input, init)
      ? tauriFetch(new Request(input, init))
      : runRealFetch(input, init);
};
