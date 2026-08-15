import { useMemo, useRef } from 'react';
import { useMachine } from '@xstate/react';
import type Peer from 'peerjs';
import { grabMachine, initGrabContext } from '../lib/machines/grab';
import { GrabState } from '../lib/constants';
import { createGrabHandlers } from '../handlers/grab';
import { cleanupSession } from '../lib/session';
import type { GrabContext } from '../types/grab';
import type { DecryptFile, HashFile } from '../types/common';
import type { ApiHeadersSource } from './use-drop';

export interface UseGrabDeps<FileType extends string | File = File> {
  apiUri: string;
  apiHeaders?: ApiHeadersSource;
  initPeer: () => Promise<Peer>;
  file: {
    decrypt: DecryptFile<FileType>;
    hash: HashFile<FileType>;
  };
  onRetryExceeded?: () => void;
  onLog?: (message: string) => void;
  logger?: Partial<{
    error: (message: string) => void;
    debug: (message: string) => void;
  }>;
}

/**
 * Platform-agnostic grab controller. `init` takes the drop id explicitly
 * since each platform sources it differently (URL query on web, deep link
 * or manual entry on desktop).
 */
export const useGrab = <FileType extends string | File = File>(
  deps: UseGrabDeps<FileType>,
) => {
  const logsRef = useRef<Array<string>>([]);
  const contextRef = useRef<GrabContext>(initGrabContext());

  const [{ value: state }, send] = useMachine(grabMachine);

  const pushLog = (message: string) => {
    logsRef.current.push(message);
    deps.onLog?.(message);
  };

  const { init: baseInit } = useMemo(
    () =>
      createGrabHandlers<FileType>({
        ctx: contextRef.current,
        sendEvent: send,
        logger: {
          info: pushLog,
          error: deps.logger?.error ?? ((m) => console.error(m)),
          debug: deps.logger?.debug ?? ((m) => console.debug(m)),
        },
        file: deps.file,
        apiUri: deps.apiUri,
        apiHeaders: deps.apiHeaders,
        initPeer: deps.initPeer,
        cleanupSession,
        onRetryExceeded: deps.onRetryExceeded,
      }),
    [],
  );

  const getLogs = () => logsRef.current;

  const getMode = () => contextRef.current.mode;

  const getSecret = () => contextRef.current.message;

  const getMeta = () => contextRef.current.meta;

  const init = async (dropId: string) => {
    contextRef.current.id = dropId;

    await baseInit();
  };

  return {
    init,
    status: state as GrabState,
    getLogs,
    getMode,
    getSecret,
    getMeta,
  };
};

export type UseGrabReturn<FileType extends string | File = File> =
  ReturnType<typeof useGrab<FileType>>;
