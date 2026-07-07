import React, { useEffect, useState } from 'react';
import { VaultExtensionMessageType, VaultWebviewMessageType } from '@ext/types';
import { postMessage, onMessage } from '../vscode';
import { CloudIcon } from '../atoms/icons';

type VaultCreateProps = {
  canCloudSync: boolean;
};

export default function VaultCreate({
  canCloudSync,
}: VaultCreateProps) {
  const [name, setName] = useState('default');
  const [cloud, setCloud] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    return onMessage((msg) => {
      if (
        msg.type === VaultWebviewMessageType.Init ||
        (msg.type === VaultWebviewMessageType.OperationError &&
          msg.operation === 'createVault')
      ) {
        setCreating(false);
      }
    });
  }, []);

  function submit() {
    if (!name.trim() || creating) return;
    setCreating(true);
    postMessage({
      type: VaultExtensionMessageType.CreateVault,
      name: name.trim(),
      ...(cloud && { cloud: true }),
    });
  }

  return (
    <div className="vault-create-screen">
      <div className="vault-create-card">
        <h2 className="vault-create-title">Create a Vault</h2>
        <p className="vault-create-desc">
          A vault stores your encrypted secrets locally, tied to
          this workspace.
        </p>
        <div className="vault-create-form">
          <input
            className="vault-input"
            placeholder="Vault name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            disabled={creating}
          />
          <label
            className={`vault-cloud-toggle${!canCloudSync ? ' locked' : ''}`}
          >
            <input
              type="checkbox"
              checked={cloud}
              onChange={(e) => setCloud(e.target.checked)}
              disabled={creating || !canCloudSync}
            />
            <CloudIcon size={14} />
            <span>
              {canCloudSync
                ? 'Enable cloud sync'
                : 'Cloud sync (premium)'}
            </span>
          </label>
          <button
            className="vault-btn"
            disabled={!name.trim() || creating}
            onClick={submit}
          >
            {creating ? 'Creating...' : 'Create Vault'}
          </button>
        </div>
      </div>
    </div>
  );
}
