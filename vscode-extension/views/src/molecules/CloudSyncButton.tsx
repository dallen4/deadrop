import React from 'react';
import { CloudIcon } from '../atoms/icons';

type CloudSyncButtonProps = {
  cloudSync: boolean;
  canCloudSync: boolean;
  syncing: boolean;
  onToggle: () => void;
  onLocked: () => void;
};

export default function CloudSyncButton({
  cloudSync,
  canCloudSync,
  syncing,
  onToggle,
  onLocked,
}: CloudSyncButtonProps) {
  const locked = !canCloudSync && !cloudSync;

  function label() {
    if (syncing) return 'Syncing...';
    if (cloudSync) return 'Synced';
    if (!canCloudSync) return 'Premium';
    return 'Local only';
  }

  return (
    <button
      className={`vault-cloud-status${cloudSync ? ' synced' : ''}${locked ? ' locked' : ''}`}
      onClick={canCloudSync || cloudSync ? onToggle : onLocked}
      disabled={syncing}
      title={
        locked
          ? 'Premium feature \u2014 upgrade to enable'
          : cloudSync
            ? 'Cloud sync enabled \u2014 click to disable'
            : 'Click to enable cloud sync'
      }
    >
      <CloudIcon />
      <span>{label()}</span>
    </button>
  );
}
