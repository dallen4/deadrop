import { useRef, useState } from 'react';
import './base.css';
import { DropDetails } from '@shared/types/common';
import { generateId } from '@shared/lib/util';

export function Sidebar() {
    const [mode, setMode] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [peerId, setPeerId] = useState<string>();

    const connect = async () => {
        const id = generateId();

        const { initPeer } = await import('./lib/peer');

        const peer = await initPeer(id);

        console.log(peer);
    };

    const startGrab = async () => {
        const dropId = inputRef.current!.value;

        const res = await fetch(
            `${process.env.REACT_APP_DEADDROP_API_URL!}?id=${dropId}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );

        const data = await res.json();

        setPeerId(data.peerId);
    };

    return (
        <div style={{ width: '100%' }}>
            <h1>deadrop: ${mode}</h1>
            {mode === 'drop' ? (
                <>
                    <p>dropping</p>
                    <button onClick={connect}>connect</button>
                </>
            ) : mode === 'grab' ? (
                <>
                    <p>peerId: {peerId}</p>
                    <input ref={inputRef} />
                    <button onClick={startGrab}>get data</button>
                </>
            ) : (
                <>
                    <button onClick={() => setMode('drop')}>Start Drop</button>
                    <h4>or enter your drop ID</h4>
                    <button onClick={() => setMode('grab')}>Start Grab</button>
                    <input />
                </>
            )}
        </div>
    );
}
