import React, { useEffect, useState } from 'react';
import type { ExtensionConfig } from '@ext/types';
import { ExtensionMessageType, WebviewMessageType } from '@ext/types';
import { postMessage, onMessage } from './vscode';
import DropPane from './organisms/DropPane';
import GrabPane from './organisms/GrabPane';
import VaultPane from './organisms/VaultPane';

type Mode = 'drop' | 'grab';

export default function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [secretsOpen, setSecretsOpen] = useState(true);
  const [vaultsOpen, setVaultsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('drop');

  useEffect(() => {
    postMessage({ type: ExtensionMessageType.Ready });
    return onMessage((msg) => {
      if (msg.type === WebviewMessageType.Init) setConfig(msg.config);
    });
  }, []);

  if (!config) return <div className="loading">Loading...</div>;

  return (
    <div className="app">
      <div className="section">
        <button
          className="section-header"
          onClick={() => setSecretsOpen((o) => !o)}
        >
          <span className={`chevron ${secretsOpen ? 'open' : ''}`}>›</span>
          Secrets
        </button>
        {secretsOpen && (
          <div className="section-body">
            <div className="mode-toggle">
              <button
                className={mode === 'drop' ? 'active' : ''}
                onClick={() => setMode('drop')}
              >
                Drop
              </button>
              <button
                className={mode === 'grab' ? 'active' : ''}
                onClick={() => setMode('grab')}
              >
                Grab
              </button>
            </div>
            {mode === 'drop' ? (
              <DropPane config={config} />
            ) : (
              <GrabPane config={config} />
            )}
          </div>
        )}
      </div>

      <div className="section">
        <button
          className="section-header"
          onClick={() => setVaultsOpen((o) => !o)}
        >
          <span className={`chevron ${vaultsOpen ? 'open' : ''}`}>›</span>
          Vaults
        </button>
        {vaultsOpen && (
          <div className="section-body">
            <VaultPane config={config} />
          </div>
        )}
      </div>
    </div>
  );
}
