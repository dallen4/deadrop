import { useMemo, useRef } from 'react';
import { useMachine } from '@xstate/react/lib/useMachine';
import { initPeer } from '../lib/peer';
import { encryptFile, hashFile } from '@shared/lib/crypto/browser';
import { DropContext } from '@shared/types/drop';
import { dropMachine, initDropContext } from '@shared/lib/machines/drop';
import { createDropHandlers } from '@shared/handlers/drop';
import { cleanupSession } from '@shared/lib/util';

export const DropPane = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const contextRef = useRef<DropContext>(initDropContext());

  // console.log(vscode);

  const [{ value: state }, send] = useMachine(dropMachine);

  const {  init, stagePayload, startHandshake, drop, cleanup } = useMemo(
    () =>
      createDropHandlers<File>({
        ctx: contextRef.current,
        sendEvent: send,
        logger: {
          info: console.info,
          error: console.error,
          debug: console.debug,
        },
        file: {
          encrypt: encryptFile,
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
      <h2>Start a Drop</h2>
      <div>
        <input ref={inputRef} />
      </div>
      <button onClick={() => console.log('CONNECT')}>connect</button>
    </>
  );
};
