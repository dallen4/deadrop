import React from 'react';
import type { ExtensionConfig } from '../../../src/types';

type Props = { config: ExtensionConfig };

export default function VaultPane({ config: _config }: Props) {
  return (
    <div className="pane">
      <p className="coming-soon">Vaults coming soon.</p>
    </div>
  );
}
