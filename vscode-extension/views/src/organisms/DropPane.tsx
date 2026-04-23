import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import type { DropContext } from '@shared/types/drop';
import {
  dropMachine,
  initDropContext,
} from '@shared/lib/machines/drop';
import { DropState } from '@shared/lib/constants';
import { createDropHandlers } from '@shared/handlers/drop';
import { encryptRaw, hashRaw } from '@shared/lib/crypto/operations';
import type { ExtensionConfig } from '@ext/types';
import {
  DropMode,
  ExtensionMessageType,
  WebviewMessageType,
} from '@ext/types';
import { postMessage, onMessage } from '../vscode';
import { initPeerFromConfig } from '../lib/peer';
import { cleanupSession } from '../lib/session';

type Props = { config: ExtensionConfig };

export default function DropPane({ config }: Props) {
  const contextRef = useRef<DropContext>(initDropContext());
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<DropMode>(DropMode.Text);
  const [dropId, setDropId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [{ value: state }, send] = useMachine(dropMachine);

  const { init, stagePayload } = useMemo(
    () =>
      createDropHandlers({
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
          encrypt: (key, iv, input: string) =>
            encryptRaw(key, iv, input),
          hash: (input: string) => hashRaw(input),
        },
        initPeer: () => initPeerFromConfig(config),
        cleanupSession,
        apiUri: config.apiUrl,
      }),
    [],
  );

  // Listen for startDrop messages from extension host
  useEffect(() => {
    return onMessage((msg) => {
      if (msg.type === WebviewMessageType.StartDrop) {
        setContent(msg.data);
        setMode(msg.mode);
      }
    });
  }, []);

  // Capture drop ID once machine reaches Ready state
  useEffect(() => {
    if (state === DropState.Ready && contextRef.current.id) {
      setDropId(contextRef.current.id);
    }
  }, [state]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await init();
      await stagePayload(content, 'raw');
    } catch (e) {
      setStarting(false);
      postMessage({ type: ExtensionMessageType.OnError, message: `Drop failed: ${(e as Error).message}` });
    }
  };

  const statusLabel: Partial<Record<DropState, string>> = {
    [DropState.Initial]: 'Ready',
    [DropState.Ready]: 'Waiting for grabber…',
    [DropState.Waiting]: 'Waiting for grabber…',
    [DropState.Connected]: 'Connected',
    [DropState.AwaitingHandshake]: 'Exchanging keys…',
    [DropState.Acknowledged]: 'Encrypting…',
    [DropState.AwaitingConfirmation]: 'Verifying integrity…',
    [DropState.Completed]: 'Drop complete!',
    [DropState.Error]: 'Error',
  };

  const isIdle = state === DropState.Initial;
  const isComplete = state === DropState.Completed;
  const isError = state === DropState.Error;

  return (
    <div className="pane">
      {isIdle && (
        <>
          <textarea
            className="content-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste secret here, or select text in editor and use 'deadrop: Start Drop'"
            rows={6}
          />
          <button
            className="action-btn"
            disabled={!content.trim() || starting}
            onClick={handleStart}
          >
            {starting ? 'Starting...' : 'Start Drop'}
          </button>
        </>
      )}

      {!isIdle && (
        <div className="status">
          <p className={`status-label ${isError ? 'error' : ''}`}>
            {statusLabel[state as DropState] ?? String(state)}
          </p>
          {dropId && !isComplete && !isError && (
            <div className="drop-id">
              <span>Drop ID</span>
              <code>{dropId}</code>
              <button
                className="action-btn"
                onClick={() => navigator.clipboard.writeText(dropId)}
              >
                Copy Drop ID
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
