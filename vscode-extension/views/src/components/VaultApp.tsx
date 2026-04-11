import React, { useEffect, useRef, useState } from 'react';
import type { ExtensionConfig } from '@ext/types';
import {
  VaultExtensionMessageType,
  VaultWebviewMessageType,
} from '@ext/types';
import { postMessage, onMessage } from '../vscode';
import { unwrapSecret } from '@shared/lib/secrets';

type SecretEntry = { name: string; environment: string };
type EditState = { value: string; saving: boolean };

// ── No vault connected ──────────────────────────────────────────────────────

function VaultCreate() {
  const [name, setName] = useState('default');
  return (
    <div className="vault-create-screen">
      <div className="vault-create-card">
        <h2 className="vault-create-title">Create a Vault</h2>
        <p className="vault-create-desc">
          A vault stores your encrypted secrets locally, tied to this workspace.
        </p>
        <div className="vault-create-form">
          <input
            className="vault-input"
            placeholder="Vault name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim())
                postMessage({ type: VaultExtensionMessageType.CreateVault, name: name.trim() });
            }}
          />
          <button
            className="vault-btn"
            disabled={!name.trim()}
            onClick={() =>
              postMessage({ type: VaultExtensionMessageType.CreateVault, name: name.trim() })
            }
          >
            Create Vault
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Secret row ──────────────────────────────────────────────────────────────

type SecretRowProps = {
  name: string;
  environment: string;
  envKey: string;
  onDelete: () => void;
  onUpdate: (value: string) => Promise<void>;
};

function SecretRow({ name, environment, envKey, onDelete, onUpdate }: SecretRowProps) {
  const [edit, setEdit] = useState<EditState | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // listen for SecretPayload targeted at this row
  useEffect(() => {
    return onMessage((msg) => {
      if (
        msg.type === VaultWebviewMessageType.SecretPayload &&
        msg.name === name &&
        msg.environment === environment
      ) {
        setFetching(false);
        unwrapSecret(envKey, msg.encryptedValue)
          .then((plain) => {
            setRevealed(plain);
            setTimeout(() => setRevealed(null), 15000);
          })
          .catch(() => {});
      }
    });
  }, [name, environment, envKey]);

  function fetchSecret() {
    setFetching(true);
    postMessage({ type: VaultExtensionMessageType.FetchSecret, name, environment });
  }

  function toggleReveal() {
    if (revealed) { setRevealed(null); return; }
    fetchSecret();
  }

  function handleCopy() {
    if (revealed) {
      navigator.clipboard.writeText(revealed).then(() =>
        postMessage({ type: VaultExtensionMessageType.OnInfo, message: `Copied "${name}".` }),
      );
      return;
    }
    // fetch then copy — use a one-shot listener
    setFetching(true);
    postMessage({ type: VaultExtensionMessageType.FetchSecret, name, environment });
    const unsub = onMessage((msg) => {
      if (
        msg.type === VaultWebviewMessageType.SecretPayload &&
        msg.name === name &&
        msg.environment === environment
      ) {
        unsub();
        setFetching(false);
        unwrapSecret(envKey, msg.encryptedValue).then((plain) => {
          navigator.clipboard.writeText(plain).then(() =>
            postMessage({ type: VaultExtensionMessageType.OnInfo, message: `Copied "${name}".` }),
          );
        });
      }
    });
  }

  function startEdit() {
    setEdit({ value: '', saving: false });
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelEdit() { setEdit(null); }

  async function saveEdit() {
    if (!edit || !edit.value.trim()) return;
    setEdit((e) => e && { ...e, saving: true });
    await onUpdate(edit.value.trim());
    setEdit(null);
  }

  return (
    <div className={`secret-row${edit ? ' editing' : ''}`}>
      <div className="secret-row-name">{name}</div>

      {edit ? (
        <div className="secret-edit-area">
          <input
            ref={inputRef}
            className="vault-input secret-edit-input"
            type="password"
            placeholder="New value"
            value={edit.value}
            onChange={(e) => setEdit((s) => s && { ...s, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <div className="secret-edit-actions">
            <button
              className="vault-btn secret-save-btn"
              disabled={!edit.value.trim() || edit.saving}
              onClick={saveEdit}
            >
              {edit.saving ? 'Saving…' : 'Save'}
            </button>
            <button className="vault-ghost-btn" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="secret-value-area">
          <span className={`secret-value-display${revealed ? ' revealed' : ''}`}>
            {revealed ?? '••••••••••••'}
          </span>
          <div className="secret-row-actions">
            <button
              className="vault-ghost-btn"
              onClick={toggleReveal}
              disabled={fetching}
              title={revealed ? 'Hide' : 'Reveal'}
            >
              {fetching ? '…' : revealed ? 'Hide' : 'Reveal'}
            </button>
            <button className="vault-ghost-btn" onClick={handleCopy} disabled={fetching} title="Copy">
              Copy
            </button>
            <button className="vault-ghost-btn" onClick={startEdit} title="Edit">
              Edit
            </button>
            <button className="vault-ghost-btn danger" onClick={onDelete} title="Delete">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main app ────────────────────────────────────────────────────────────────

export default function VaultApp() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [environments, setEnvironments] = useState<Record<string, string>>({});
  const [activeEnv, setActiveEnv] = useState('');
  const [newEnvName, setNewEnvName] = useState('');
  const [addEnvOpen, setAddEnvOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', value: '' });
  const configRef = useRef<ExtensionConfig | null>(null);

  useEffect(() => {
    postMessage({ type: VaultExtensionMessageType.Ready });
    return onMessage((msg) => {
      switch (msg.type) {
        case VaultWebviewMessageType.Init: {
          configRef.current = msg.config;
          setConfig(msg.config);
          const envs = msg.config.vaultEnvironmentKeys ?? {};
          setEnvironments(envs);
          const first = Object.keys(envs)[0] ?? '';
          setActiveEnv(first);
          break;
        }
        case VaultWebviewMessageType.SecretNames:
          setSecrets(msg.names);
          break;
        case VaultWebviewMessageType.SecretAdded:
          setSecrets((prev) => [...prev, { name: msg.name, environment: msg.environment }]);
          setAddForm({ name: '', value: '' });
          break;
        case VaultWebviewMessageType.SecretUpdated:
          // row manages its own edit state; nothing to do at list level
          break;
        case VaultWebviewMessageType.SecretDeleted:
          setSecrets((prev) =>
            prev.filter((s) => !(s.name === msg.name && s.environment === msg.environment)),
          );
          break;
        case VaultWebviewMessageType.EnvironmentCreated: {
          const { name, key } = msg;
          setEnvironments((prev) => ({ ...prev, [name]: key }));
          if (configRef.current) {
            configRef.current = {
              ...configRef.current,
              vaultEnvironmentKeys: { ...configRef.current.vaultEnvironmentKeys, [name]: key },
            };
          }
          setActiveEnv(name);
          setNewEnvName('');
          setAddEnvOpen(false);
          break;
        }
      }
    });
  }, []);

  if (!config) return <div className="vault-loading">Loading…</div>;
  if (!config.vaultEnvironmentKeys) return <VaultCreate />;

  const envList = Object.keys(environments);
  const filtered = secrets.filter((s) => s.environment === activeEnv);
  const envKey = environments[activeEnv] ?? '';

  function handleAddSecret(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.value.trim()) return;
    postMessage({
      type: VaultExtensionMessageType.AddSecret,
      name: addForm.name.trim(),
      value: addForm.value.trim(),
      environment: activeEnv,
    });
  }

  function handleAddEnv(e: React.FormEvent) {
    e.preventDefault();
    const name = newEnvName.trim();
    if (!name) return;
    postMessage({ type: VaultExtensionMessageType.CreateEnvironment, name });
  }

  return (
    <div className="vault-layout-outer">
    <div className="vault-layout">
      {/* ── Header ── */}
      <header className="vault-header">
        <span className="vault-header-title">deadrop vault</span>
        {config.vaultName && (
          <span className="vault-header-name">{config.vaultName}</span>
        )}
      </header>

      {/* ── Two-column body ── */}
      <div className="vault-body">
      {/* ── Left sidebar: environments ── */}
      <nav className="vault-sidebar">
        <div className="vault-sidebar-label">Environments</div>
        <ul className="vault-env-list">
          {envList.map((env) => (
            <li key={env}>
              <button
                className={`vault-env-item${activeEnv === env ? ' active' : ''}`}
                onClick={() => setActiveEnv(env)}
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
          <form className="vault-add-env-form" onSubmit={handleAddEnv}>
            <input
              className="vault-input"
              placeholder="env name"
              value={newEnvName}
              autoFocus
              onChange={(e) => setNewEnvName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setAddEnvOpen(false)}
            />
            <div className="vault-add-env-actions">
              <button className="vault-btn vault-btn-sm" type="submit" disabled={!newEnvName.trim()}>Add</button>
              <button className="vault-ghost-btn" type="button" onClick={() => setAddEnvOpen(false)}>✕</button>
            </div>
          </form>
        ) : (
          <button className="vault-new-env-btn" onClick={() => setAddEnvOpen(true)}>
            + New environment
          </button>
        )}
      </nav>

      {/* ── Right main: secrets ── */}
      <main className="vault-main">
        <div className="vault-main-header">
          <h1 className="vault-main-title">{activeEnv}</h1>
          <span className="vault-main-count">{filtered.length} secret{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="vault-secret-list">
          {filtered.length === 0 ? (
            <p className="vault-empty-msg">No secrets yet for <strong>{activeEnv}</strong>.</p>
          ) : (
            filtered.map((s) => (
              <SecretRow
                key={`${s.environment}:${s.name}`}
                name={s.name}
                environment={s.environment}
                envKey={envKey}
                onDelete={() =>
                  postMessage({ type: VaultExtensionMessageType.DeleteSecret, name: s.name, environment: s.environment })
                }
                onUpdate={(value) =>
                  new Promise((resolve, reject) => {
                    postMessage({ type: VaultExtensionMessageType.UpdateSecret, name: s.name, value, environment: s.environment });
                    const unsub = onMessage((msg) => {
                      if (msg.type === VaultWebviewMessageType.SecretUpdated && msg.name === s.name && msg.environment === s.environment) {
                        unsub(); resolve();
                      }
                      if (msg.type === VaultWebviewMessageType.SecretDeleted) { unsub(); reject(new Error('deleted')); }
                    });
                  })
                }
              />
            ))
          )}
        </div>

        {/* Add secret form */}
        <form className="vault-add-form" onSubmit={handleAddSecret}>
          <div className="vault-add-label">New Secret</div>
          <div className="vault-add-row">
            <input
              className="vault-input"
              placeholder="NAME"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="vault-input"
              placeholder="value"
              type="password"
              value={addForm.value}
              onChange={(e) => setAddForm((f) => ({ ...f, value: e.target.value }))}
            />
            <button
              className="vault-btn"
              type="submit"
              disabled={!addForm.name.trim() || !addForm.value.trim()}
            >
              Add
            </button>
          </div>
        </form>
      </main>
      </div>{/* vault-body */}
    </div>
    </div>
  );
}
