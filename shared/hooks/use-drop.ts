import { useMemo, useRef } from 'react';
import { useMachine } from '@xstate/react';
import type Peer from 'peerjs';
import { dropMachine, initDropContext } from '../lib/machines/drop';
import { DropState } from '../lib/constants';
import { createDropHandlers } from '../handlers/drop';
import { cleanupSession } from '../lib/session';
import type { DropContext } from '../types/drop';
import type { EncryptFile, HashFile } from '../types/common';

// Auth header source injected by each platform (web: @clerk/nextjs,
// desktop: @clerk/react, cli: e2e token). Mirrors the handler's own type.
export type ApiHeadersSource =
  | Record<string, string>
  | (() => Record<string, string> | Promise<Record<string, string>>);

export interface UseDropDeps<FileType extends string | File = File> {
  apiUri: string;
  apiHeaders?: ApiHeadersSource;
  initPeer: () => Promise<Peer>;
  file: {
    encrypt: EncryptFile<FileType>;
    hash: HashFile<FileType>;
  };
  // Called when the connection retries are exhausted (platform surfaces a toast).
  onRetryExceeded?: () => void;
  // Optional extra sink for `info` logs beyond the internal ring buffer
  // (e.g. the vscode webview forwards them to the extension host).
  onLog?: (message: string) => void;
  // Override error/debug sinks; info always feeds the internal buffer + onLog.
  logger?: Partial<{
    error: (message: string) => void;
    debug: (message: string) => void;
  }>;
}

/**
 * Platform-agnostic drop controller. Owns the XState machine + drop handlers;
 * each platform injects its API config, peer factory, and crypto adapter.
 * Navigation guards are intentionally left to the platform (they differ:
 * next/router on web, react-router + Tauri window close on desktop).
 */
export const useDrop = <FileType extends string | File = File>(
  deps: UseDropDeps<FileType>,
) => {
  const logsRef = useRef<Array<string>>([]);
  const contextRef = useRef<DropContext>(initDropContext());

  const [{ value: state, context }, send] = useMachine(dropMachine);

  const pushLog = (message: string) => {
    logsRef.current.push(message);
    deps.onLog?.(message);
  };

  const { init: initDrop, stagePayload, startSession, stopAccepting } =
    useMemo(
      () =>
        createDropHandlers<FileType>({
          ctx: contextRef.current,
          sendEvent: send,
          logger: {
            info: pushLog,
            error: deps.logger?.error ?? ((m) => console.error(m)),
            debug: deps.logger?.debug ?? ((m) => console.debug(m)),
          },
          file: deps.file,
          cleanupSession,
          apiUri: deps.apiUri,
          apiHeaders: deps.apiHeaders,
          initPeer: deps.initPeer,
          onRetryExceeded: deps.onRetryExceeded,
        }),
      [],
    );

  // must be called before init() - the requested cap is sent when the
  // drop session is created
  const setMaxGrabbers = (maxGrabbers: number | null) => {
    contextRef.current.maxGrabbers = maxGrabbers;
  };

  const getDropId = () => contextRef.current.id;

  const getLogs = () => logsRef.current;

  return {
    init: initDrop,
    setPayload: stagePayload,
    startSession,
    stopAccepting,
    setMaxGrabbers,
    getDropId,
    getLogs,
    status: state as DropState,
    grabbers: context.grabbers,
    accepting: context.accepting,
    maxGrabbers: context.maxGrabbers,
  };
};

export type UseDropReturn<FileType extends string | File = File> =
  ReturnType<typeof useDrop<FileType>>;
