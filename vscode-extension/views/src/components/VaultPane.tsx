import React from 'react';
import type { ExtensionConfig } from '@ext/types';
import { ExtensionMessageType } from '@ext/types';
import { postMessage } from '../vscode';

type Props = { config: ExtensionConfig };

export default function VaultPane({ config }: Props) {
  const vaults = config.vaults ?? {};
  const vaultNames = Object.keys(vaults);
  const activeVault = config.vaultName ?? null;

  return (
    <div className="vault-pane">
      {vaultNames.length === 0 ? (
        <p className="vault-pane-empty">No vaults yet.</p>
      ) : (
        <ul className="vault-pane-list">
          {vaultNames.map((name) => (
            <li key={name} className="vault-pane-item">
              <span className={`vault-pane-name${name === activeVault ? ' active' : ''}`}>
                {name}
              </span>
              <button
                className="vault-pane-open-btn"
                onClick={() => {
                  postMessage({ type: ExtensionMessageType.SwitchVault, name });
                }}
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        className="vault-pane-new-btn"
        onClick={() => postMessage({ type: ExtensionMessageType.OpenVault })}
      >
        + New vault
      </button>
    </div>
  );
}
