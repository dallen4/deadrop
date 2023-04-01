import { useState } from "react";

export function Sidebar() {
    const [mode, setMode] = useState<string | null>(null);
    return (
        <div style={{ border: '1px red solid', width: '100%' }}>
            <h1>deadrop: ${mode}</h1>
            {mode === 'drop' ? (
                <p>dropping</p>
            ) : mode === 'grab' ? (
                <p>grabbing</p>
            ) : (
                <>
                    <button onClick={() => setMode('drop')}>Start Drop</button>
                    <h4>or enter your drop ID</h4>
                    <input />
                </>
            )}
        </div>
    );
}
