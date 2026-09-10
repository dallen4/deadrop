import type { Clerk as ClerkType } from '@clerk/clerk-js';
import { Clerk } from '@clerk/clerk-js';
import { loadClerkUIScript } from '@clerk/shared/loadClerkJsScript';
import type { ClerkUIConstructor } from '@clerk/shared/types';
import { invoke } from '@tauri-apps/api/core';
import { CLERK_PUBLISHABLE_KEY } from '../env';
import { applyNativeFetchPatch } from './native-fetch';

// Runs Clerk in native mode (standardBrowser: false) so desktop shares one
// session with the CLI via the OS keychain, instead of cookies/localStorage.
// Mirrors cli/lib/auth/clerk.ts's clerkFactory almost exactly — same public
// clerk-js API (new Clerk(pk), getFapiClient().onBeforeRequest/
// onAfterResponse, load({ standardBrowser: false })) — just swapping
// napi-rs/keyring calls for invoke() round-trips to the Rust commands in
// desktop/src-tauri/src/keychain_store.rs.

const getAuthToken = (): Promise<string | null> =>
  invoke('get_auth_token');

const setAuthToken = (token: string): Promise<void> =>
  invoke('set_auth_token', { token });

let clerkInstance: ClerkType | undefined;
let loadPromise: Promise<ClerkType> | undefined;

export const createNativeClerkClient = (): Promise<ClerkType> => {
  if (loadPromise) return loadPromise;

  applyNativeFetchPatch();

  clerkInstance = new Clerk(CLERK_PUBLISHABLE_KEY);
  const fapiClient = clerkInstance.getFapiClient();

  fapiClient.onBeforeRequest(async (requestInit) => {
    requestInit.credentials = 'omit';
    requestInit.url?.searchParams.append('_is_native', '1');

    const token = await getAuthToken();
    const headers = requestInit.headers as Headers;
    headers.set('authorization', token ?? '');
    headers.set('x-mobile', '1');
    // Consumed by native-fetch.ts to route this request
    // through Rust and suppress the webview's auto-attached Origin header.
    headers.set('x-tauri-fetch', '1');
    headers.set('x-no-origin', '1');
  });

  fapiClient.onAfterResponse(async (_, response) => {
    const authHeader = response?.headers.get('authorization');
    if (authHeader) await setAuthToken(authHeader);
  });

  loadPromise = (async () => {
    // Clerk Core 3 (clerk-js v6) no longer bundles UI components (SignIn
    // modal, UserButton, etc.) in the main module — they're hotloaded from
    // Clerk's CDN and must be handed to load() via the `ui` option, or
    // @clerk/react's prebuilt components throw "Clerk was not loaded with
    // Ui components". Best-effort: if the CDN script fails to load (e.g.
    // offline), fall back to no UI rather than blocking sign-in entirely.
    let clerkUI: ClerkUIConstructor | undefined;
    try {
      await loadClerkUIScript({ publishableKey: CLERK_PUBLISHABLE_KEY });
      clerkUI = (
        window as typeof window & {
          __internal_ClerkUICtor?: ClerkUIConstructor;
        }
      ).__internal_ClerkUICtor;
    } catch {
      // handled by the fallback below
    }

    await clerkInstance!.load({
      standardBrowser: false,
      ...(clerkUI ? { ui: { ClerkUI: clerkUI } } : {}),
    });

    return clerkInstance!;
  })();

  return loadPromise;
};
