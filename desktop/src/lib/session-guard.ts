import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

const inTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// Prevents abandoning an active peer session: blocks in-app route changes
// (react-router) and, when running in the Tauri shell, the native window
// close. In a plain `vite dev` (no Tauri) the window guard is a no-op.
export const usePeerSessionGuard = (active: boolean) => {
  useBlocker(() => active);

  useEffect(() => {
    if (!active || !inTauri()) return;

    let unlisten: (() => void) | undefined;

    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow()
        .onCloseRequested((event) => {
          event.preventDefault();
        })
        .then((u) => {
          unlisten = u;
        });
    });

    return () => unlisten?.();
  }, [active]);
};
