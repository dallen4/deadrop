import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import type { GrabContext } from '@shared/types/grab';
import {
  grabMachine,
  initGrabContext,
} from '@shared/lib/machines/grab';
import { GrabState } from '@shared/lib/constants';
import { createGrabHandlers } from '@shared/handlers/grab';
import { decryptRaw, hashRaw } from '@shared/lib/crypto/operations';
import type { ExtensionConfig } from '@ext/types';
import {
  ExtensionMessageType,
  WebviewMessageType,
} from '@ext/types';
import { postMessage, onMessage } from '../vscode';
import { initPeerFromConfig } from '../lib/peer';
import { cleanupSession } from '../lib/session';

type Props = { config: ExtensionConfig };

export default function GrabPane({ config }: Props) {
  const contextRef = useRef<GrabContext>(initGrabContext());
  const [dropId, setDropId] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [{ value: state }, send] = useMachine(grabMachine);

  const { init } = useMemo(
    () =>
      createGrabHandlers({
        ctx: contextRef.current,
        sendEvent: send,
        logger: {
          info: (msg) =>
            postMessage({ type: ExtensionMessageType.OnInfo, message: msg }),
          error: (msg) =>
            postMessage({ type: ExtensionMessageType.OnError, message: msg }),
          debug: console.debug,
        },
        file: {
          decrypt: (key, iv, input: string, _meta) =>
            decryptRaw(key, iv, input),
          hash: (input: string) => hashRaw(input),
        },
        initPeer: () => initPeerFromConfig(config),
        cleanupSession,
        apiUri: config.apiUrl,
      }),
    [],
  );

  // Listen for startGrab messages from extension host (e.g. from grab command)
  useEffect(() => {
    return onMessage((msg) => {
      if (msg.type === WebviewMessageType.StartGrab) {
        setDropId(msg.dropId);
        contextRef.current.id = msg.dropId;
        init();
      }
    });
  }, []);

  // Once confirmed, surface the secret and notify host
  useEffect(() => {
    if (state === GrabState.Confirmed && contextRef.current.message) {
      const payload = contextRef.current.message as string;
      setSecret(payload);
      postMessage({ type: ExtensionMessageType.SecretReceived, payload });
    }
  }, [state]);

  const handleGrab = async () => {
    setStarting(true);
    contextRef.current.id = dropId;
    try {
      await init();
    } catch (e) {
      setStarting(false);
      postMessage({ type: ExtensionMessageType.OnError, message: `Grab failed: ${(e as Error).message}` });
    }
  };

  const statusLabel: Partial<Record<GrabState, string>> = {
    [GrabState.Initial]: 'Ready',
    [GrabState.Ready]: 'Connecting…',
    [GrabState.Connected]: 'Connected',
    [GrabState.Waiting]: 'Receiving…',
    [GrabState.Received]: 'Verifying integrity…',
    [GrabState.Confirmed]: 'Secret received!',
    [GrabState.Completed]: 'Done',
    [GrabState.Error]: 'Error',
  };

  const isIdle = state === GrabState.Initial;
  const isConfirmed = state === GrabState.Confirmed;
  const isError = state === GrabState.Error;

  return (
    <div className="pane">
      {isIdle && (
        <>
          <input
            className="id-input"
            value={dropId}
            onChange={(e) => setDropId(e.target.value)}
            placeholder="Drop ID"
          />
          <button
            className="action-btn"
            disabled={!dropId.trim() || starting}
            onClick={handleGrab}
          >
            {starting ? 'Connecting...' : 'Grab'}
          </button>
        </>
      )}

      {!isIdle && (
        <div className="status">
          <p className={`status-label ${isError ? 'error' : ''}`}>
            {statusLabel[state as GrabState] ?? String(state)}
          </p>
          {isConfirmed && secret && (
            <div className="secret-output">
              <span>Secret</span>
              <pre>{secret}</pre>
              <button
                className="action-btn"
                onClick={() => navigator.clipboard.writeText(secret)}
              >
                Copy Secret
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
