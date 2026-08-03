import type { Clerk } from '@clerk/clerk-js';
import { StrictMode, Suspense, use, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import { invoke } from '@tauri-apps/api/core';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { RouterProvider } from 'react-router-dom';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';

import { router } from './router';
import { createNativeClerkClient } from './lib/native-clerk';

// Runs Clerk in native mode (see desktop/src/lib/native-clerk.ts +
// desktop/src-tauri/src/keychain_store.rs) so desktop shares one session
// with the CLI via the OS keychain, rather than the standard-browser
// cookie/localStorage flow.
const clerkPromise = createNativeClerkClient();

// Clerk's own signOut() deactivates the session but doesn't drop the
// client-level token (it supports multi-account switching) — clear the
// shared keychain entry explicitly on sign-out, mirroring
// cli/actions/logout.ts's clearSession() call after clerkClient.signOut().
const useClearSharedTokenOnSignOut = (clerk: Clerk) => {
  const wasSignedIn = useRef(Boolean(clerk.session));

  useEffect(() => {
    return clerk.addListener(({ session }) => {
      const isSignedIn = Boolean(session);
      if (wasSignedIn.current && !isSignedIn) {
        void invoke('clear_auth_token');
      }
      wasSignedIn.current = isSignedIn;
    });
  }, [clerk]);
};

const AppWithClerk = () => {
  const clerk = use(clerkPromise);
  useClearSharedTokenOnSignOut(clerk);

  return (
    <ClerkProvider
      publishableKey={clerk.publishableKey}
      Clerk={clerk}
      appearance={{
        // OAuth redirects can't complete inside the Tauri webview yet (no
        // deep-link callback handler — desktop/CLAUDE.md follow-up), so
        // hide social sign-in here rather than let users hit a broken
        // flow. Email/password + email OTP still work.
        elements: {
          socialButtonsRoot: { display: 'none' },
          dividerRow: { display: 'none' },
        },
      }}
    >
      <MantineProvider
        defaultColorScheme={'dark'}
        theme={{ primaryColor: 'blue' }}
      >
        <Notifications />
        <RouterProvider router={router} />
      </MantineProvider>
    </ClerkProvider>
  );
};

ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
).render(
  <StrictMode>
    <Suspense fallback={null}>
      <AppWithClerk />
    </Suspense>
  </StrictMode>,
);
