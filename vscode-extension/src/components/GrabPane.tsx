import { useMemo, useRef, useEffect } from 'react';
import { useMachine } from '@xstate/react/lib/useMachine';
import { GrabContext } from '@shared/types/grab';
import { grabMachine, initGrabContext } from '@shared/lib/machines/grab';
import { createGrabHandlers } from '@shared/handlers/grab';
import { initPeer } from '../lib/peer';
import { decryptFile, hashFile } from '@shared/lib/crypto/browser';
import { cleanupSession } from '@shared/lib/util';
import { GrabState } from '@shared/lib/constants';
import { sendMessage } from '../lib/vscode';

export const GrabPane = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const contextRef = useRef<GrabContext>(initGrabContext());

  const [{ value: state }, send] = useMachine(grabMachine);

  useEffect(() => {
    console.log(state);
    if (state === GrabState.Confirmed)
      sendMessage({
        type: 'secretReceived',
        payload: contextRef.current.message,
      });
  }, [state]);

  const { init } = useMemo(
    () =>
      createGrabHandlers({
        ctx: contextRef.current,
        sendEvent: send,
        logger: {
          info: console.info,
          error: console.error,
          debug: console.debug,
        },
        file: {
          decrypt: decryptFile,
          hash: hashFile,
        },
        initPeer,
        cleanupSession,
        apiUri: process.env.REACT_APP_DEADDROP_API_URL!,
      }),
    [],
  );

  const startGrab = async () => {
    const dropId = inputRef.current!.value;

    contextRef.current.id = dropId;

    await init();
  };

  return (
    <>
      <h2>Grab a Secret</h2>
      <input ref={inputRef} placeholder={'drop ID here'} />
      <button onClick={startGrab}>Grab Secret</button>
    </>
  );
};
