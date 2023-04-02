import { useRef, useState } from 'react';
import './base.css';
import { DropDetails } from '@shared/types/common';

export function Sidebar() {
    const [mode, setMode] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [peerId, setPeerId] = useState<string>();

    const startGrab = async () => {
        const dropId = inputRef.current!.value;

        const res = await fetch('https://alpha.deadrop.io/api/drop?id=' + dropId, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await res.json();

        setPeerId(data.peerId);
    };

    return (
        <div style={{ width: '100%' }}>
            <h1>deadrop: ${mode}</h1>
            {mode === 'drop' ? (
                <p>dropping</p>
            ) : mode === 'grab' ? (
                <>
                    <p>peerId: {peerId}</p>
                    <input ref={inputRef} />
                    <button onClick={startGrab} >get data</button>
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
