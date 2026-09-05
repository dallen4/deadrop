import type { Clerk } from '@clerk/clerk-js';
import {
  Component,
  StrictMode,
  Suspense,
  use,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
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
import { applyNativeFetchPatch } from './lib/native-fetch';
import { createNativeClerkClient } from './lib/native-clerk';

// Must land before any Clerk or worker request goes out.
applyNativeFetchPatch();

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

// TEMPORARY diagnostic: `Suspense fallback={null}` hides Clerk init
// failures as a permanent blank screen with nothing in any log. This
// surfaces the actual error on-screen instead. Remove once the boot
// white-screen issue is root-caused.
class BootErrorBoundary extends Component<
  { children: ReactNode },
  { error: unknown }
> {
  state = { error: undefined as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (this.state.error !== undefined) {
      return (
        <pre style={{ padding: 24, whiteSpace: 'pre-wrap', color: 'red' }}>
          {String(
            this.state.error instanceof Error
              ? (this.state.error.stack ?? this.state.error.message)
              : this.state.error,
          )}
        </pre>
      );
    }
    return this.props.children;
  }
}

const BootLoading = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      height: '100vh',
      width: '100vw',
      background: '#1a1b1e',
    }}
  >
    <img
      src={'/handshake.svg'}
      alt={'deadrop'}
      width={48}
      height={48}
      style={{ animation: 'deadrop-pulse 1.6s ease-in-out infinite' }}
    />
    <span
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        fontWeight: 600,
        fontSize: 14,
        letterSpacing: 0.2,
        color: '#c1c2c5',
      }}
    >
      deadrop
    </span>
    <style>{`
      @keyframes deadrop-pulse {
        0%, 100% { opacity: 0.45; transform: scale(0.96); }
        50% { opacity: 1; transform: scale(1); }
      }
    `}</style>
  </div>
);

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
        theme={{ primaryColor: 'blue', scale: 1.1 }}
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
    <BootErrorBoundary>
      <Suspense fallback={<BootLoading />}>
        <AppWithClerk />
      </Suspense>
    </BootErrorBoundary>
  </StrictMode>,
);
