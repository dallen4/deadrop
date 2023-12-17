import { useMemo, useRef, useState } from 'react';
import './base.css';
import { useMachine } from '@xstate/react/lib/useMachine';
import { GrabContext } from '@shared/types/grab';
import { grabMachine, initGrabContext } from '@shared/lib/machines/grab';
import { MessageType } from '@shared/lib/constants';
import { createGrabHandlers } from '@shared/handlers/grab';
import { initPeer } from './lib/peer';
import { decryptFile, hashFile } from '@shared/lib/crypto/browser';

export function Sidebar() {
    const [mode, setMode] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [peerId, setPeerId] = useState<string>();
    const contextRef = useRef<GrabContext>(initGrabContext());
    const timersRef = useRef(new Map<MessageType, NodeJS.Timeout>());

    const [{ value: state }, send] = useMachine(grabMachine);

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
                cleanupSession: () => {},
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
        <div style={{ width: '100%', padding: '0.5em' }}>
            {mode === 'drop' ? (
                <>
                    <p>dropping</p>
                    <div>
                    <input ref={inputRef} />
                    </div>
                    <button onClick={() => console.log('CONNECT')}>
                        connect
                    </button>
                </>
            ) : mode === 'grab' ? (
                <>
                    <p>peerId: {peerId}</p>
                    <input ref={inputRef} placeholder={'drop ID here'} />
                    <button onClick={startGrab}>Grab Secret</button>
                </>
            ) : (
                <>
                    <p>Start a drop to share a secret!</p>
                    <button onClick={() => setMode('drop')}>Start Drop</button>
                    <h4>or enter your drop ID:</h4>
                    <input ref={inputRef} placeholder={'drop ID here'} />
                    <button onClick={() => setMode('grab')}>Start Grab</button>
                </>
            )}
        </div>
    );
}