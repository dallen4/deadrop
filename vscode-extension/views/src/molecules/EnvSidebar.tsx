import React, { useState } from 'react';

type SecretEntry = { name: string; environment: string };

type EnvSidebarProps = {
  envList: string[];
  activeEnv: string;
  secrets: SecretEntry[];
  addingEnv: boolean;
  onSelectEnv: (env: string) => void;
  onAddEnv: (name: string) => void;
};

export default function EnvSidebar({
  envList,
  activeEnv,
  secrets,
  addingEnv,
  onSelectEnv,
  onAddEnv,
}: EnvSidebarProps) {
  const [addEnvOpen, setAddEnvOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = newEnvName.trim();
    if (!name || addingEnv) return;
    onAddEnv(name);
    setNewEnvName('');
    setAddEnvOpen(false);
  }

  return (
    <nav className="vault-sidebar">
      <div className="vault-sidebar-label">Environments</div>
      <ul className="vault-env-list">
        {envList.map((env) => (
          <li key={env}>
            <button
              className={`vault-env-item${activeEnv === env ? ' active' : ''}`}
              onClick={() => onSelectEnv(env)}
            >
              <span className="vault-env-name">{env}</span>
              <span className="vault-env-count">
                {secrets.filter((s) => s.environment === env).length}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {addEnvOpen ? (
        <form
          className="vault-add-env-form"
          onSubmit={handleSubmit}
        >
          <input
            className="vault-input"
            placeholder="env name"
            value={newEnvName}
            autoFocus
            onChange={(e) => setNewEnvName(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Escape' && setAddEnvOpen(false)
            }
            disabled={addingEnv}
          />
          <div className="vault-add-env-actions">
            <button
              className="vault-btn vault-btn-sm"
              type="submit"
              disabled={!newEnvName.trim() || addingEnv}
            >
              {addingEnv ? '...' : 'Add'}
            </button>
            <button
              className="vault-ghost-btn"
              type="button"
              onClick={() => setAddEnvOpen(false)}
              disabled={addingEnv}
            >
              \u2715
            </button>
          </div>
        </form>
      ) : (
        <button
          className="vault-new-env-btn"
          onClick={() => setAddEnvOpen(true)}
        >
          + New environment
        </button>
      )}
    </nav>
  );
}
