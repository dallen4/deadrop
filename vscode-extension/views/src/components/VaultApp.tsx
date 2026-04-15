import React, { useEffect, useRef, useState } from 'react';
import type { ExtensionConfig } from '@ext/types';
import {
  VaultExtensionMessageType,
  VaultWebviewMessageType,
} from '@ext/types';
import { postMessage, onMessage } from '../vscode';
import { unwrapSecret } from '@shared/lib/secrets';

type SecretEntry = { name: string; environment: string };

// ── No vault connected ──────────────────────────────────────────────────────

function VaultCreate() {
  const [name, setName] = useState('default');
  const [cloud, setCloud] = useState(false);

  function submit() {
    if (!name.trim()) return;
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
          A vault stores your encrypted secrets locally, tied to this workspace.
        </p>
        <div className="vault-create-form">
          <input
            className="vault-input"
            placeholder="Vault name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
          <label className="vault-cloud-toggle">
            <input
              type="checkbox"
              checked={cloud}
              onChange={(e) => setCloud(e.target.checked)}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
            <span>Enable cloud sync</span>
          </label>
          <button className="vault-btn" disabled={!name.trim()} onClick={submit}>
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
  onUpdateValue: (value: string) => Promise<void>;
  onRename: (newName: string) => Promise<void>;
};

function SecretRow({
  name,
  environment,
  envKey,
  onDelete,
  onUpdateValue,
  onRename,
}: SecretRowProps) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const pendingAction = useRef<'reveal' | 'copy' | null>(null);
  const [nameDraft, setNameDraft] = useState(name);
  const [editingValue, setEditingValue] = useState(false);
  const [valueDraft, setValueDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return onMessage((msg) => {
      if (
        msg.type === VaultWebviewMessageType.SecretPayload &&
        msg.name === name &&
        msg.environment === environment
      ) {
        const action = pendingAction.current;
        pendingAction.current = null;
        setFetching(false);
        unwrapSecret(envKey, msg.encryptedValue)
          .then((plain) => {
            if (action === 'copy') {
              navigator.clipboard.writeText(plain).then(() =>
                postMessage({ type: VaultExtensionMessageType.OnInfo, message: `Copied "${name}".` }),
              );
            } else {
              setRevealed(plain);
              setTimeout(() => setRevealed(null), 15000);
            }
          })
          .catch(() => {});
      }
    });
  }, [name, environment, envKey]);

  function toggleReveal() {
    if (revealed) { setRevealed(null); return; }
    pendingAction.current = 'reveal';
    setFetching(true);
    postMessage({ type: VaultExtensionMessageType.FetchSecret, name, environment });
  }

  function handleCopy() {
    if (revealed) {
      navigator.clipboard.writeText(revealed).then(() =>
        postMessage({ type: VaultExtensionMessageType.OnInfo, message: `Copied "${name}".` }),
      );
      return;
    }
    pendingAction.current = 'copy';
    setFetching(true);
    postMessage({ type: VaultExtensionMessageType.FetchSecret, name, environment });
  }

  function startEditName() {
    setNameDraft(name);
    setEditingName(true);
  }

  async function saveName() {
    const next = nameDraft.trim();
    if (!next || next === name) { setEditingName(false); return; }
    setSaving(true);
    try { await onRename(next); } finally { setSaving(false); setEditingName(false); }
  }

  function startEditValue() {
    setValueDraft('');
    setEditingValue(true);
  }

  async function saveValue() {
    const next = valueDraft.trim();
    if (!next) { setEditingValue(false); return; }
    setSaving(true);
    try { await onUpdateValue(next); } finally { setSaving(false); setEditingValue(false); setValueDraft(''); }
  }

  return (
    <div className="secret-row">
      {/* Name */}
      <div className="secret-field secret-field-name">
        {editingName ? (
          <>
            <input
              className="vault-input secret-field-input"
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') setEditingName(false);
              }}
              disabled={saving}
            />
            <button
              className="icon-btn"
              onClick={saveName}
              disabled={saving || !nameDraft.trim()}
              title="Save name"
              aria-label="Save name"
            >✓</button>
            <button
              className="icon-btn"
              onClick={() => setEditingName(false)}
              disabled={saving}
              title="Cancel"
              aria-label="Cancel"
            >✕</button>
          </>
        ) : (
          <>
            <span className="secret-name-text" onDoubleClick={startEditName}>{name}</span>
            <button
              className="icon-btn icon-btn-subtle"
              onClick={startEditName}
              title="Rename"
              aria-label="Rename"
            >✎</button>
          </>
        )}
      </div>

      {/* Value */}
      <div className="secret-field secret-field-value">
        {editingValue ? (
          <>
            <input
              className="vault-input secret-field-input"
              type="password"
              placeholder="New value"
              autoFocus
              value={valueDraft}
              onChange={(e) => setValueDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveValue();
                if (e.key === 'Escape') setEditingValue(false);
              }}
              disabled={saving}
            />
            <button
              className="icon-btn"
              onClick={saveValue}
              disabled={saving || !valueDraft.trim()}
              title="Save value"
              aria-label="Save value"
            >✓</button>
            <button
              className="icon-btn"
              onClick={() => setEditingValue(false)}
              disabled={saving}
              title="Cancel"
              aria-label="Cancel"
            >✕</button>
          </>
        ) : (
          <>
            <span className={`secret-value-display${revealed ? ' revealed' : ''}`}>
              {revealed ?? '••••••••••••'}
            </span>
            <div className="secret-row-actions">
              <button
                className="icon-btn"
                onClick={toggleReveal}
                disabled={fetching}
                title={revealed ? 'Hide' : 'Reveal'}
                aria-label={revealed ? 'Hide' : 'Reveal'}
              >{fetching ? '…' : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {revealed ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              )}</button>
              <button
                className="icon-btn"
                onClick={handleCopy}
                disabled={fetching}
                title="Copy"
                aria-label="Copy"
              >⧉</button>
              <button
                className="icon-btn"
                onClick={startEditValue}
                title="Edit value"
                aria-label="Edit value"
              >✎</button>
              {confirmDelete ? (
                <>
                  <button
                    className="icon-btn icon-btn-danger"
                    onClick={() => { setConfirmDelete(false); onDelete(); }}
                    title="Confirm delete"
                    aria-label="Confirm delete"
                  >✓</button>
                  <button
                    className="icon-btn"
                    onClick={() => setConfirmDelete(false)}
                    title="Cancel"
                    aria-label="Cancel"
                  >✕</button>
                </>
              ) : (
                <button
                  className="icon-btn icon-btn-danger"
                  onClick={() => setConfirmDelete(true)}
                  title="Delete"
                  aria-label="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              )}
            </div>
          </>
        )}
      </div>
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
  const [cloudSync, setCloudSync] = useState(false);
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
          setCloudSync(!!msg.config.cloudSync);
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
        case VaultWebviewMessageType.SecretRenamed:
          setSecrets((prev) =>
            prev.map((s) =>
              s.name === msg.oldName && s.environment === msg.environment
                ? { name: msg.newName, environment: msg.environment }
                : s,
            ),
          );
          break;
        case VaultWebviewMessageType.SecretDeleted:
          setSecrets((prev) =>
            prev.filter((s) => !(s.name === msg.name && s.environment === msg.environment)),
          );
          break;
        case VaultWebviewMessageType.CloudSyncEnabled:
          setCloudSync(true);
          break;
        case VaultWebviewMessageType.CloudSyncDisabled:
          setCloudSync(false);
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
        <div className="vault-header-left">
          <span className="vault-header-title">deadrop vault</span>
          {config.vaultName && (
            <span className="vault-header-name" data-tooltip={config.vaultLocation ?? ''}>
              {config.vaultName}
            </span>
          )}
        </div>
        <button
          className={`vault-cloud-status${cloudSync ? ' synced' : ''}`}
          onClick={() =>
            postMessage({
              type: cloudSync
                ? VaultExtensionMessageType.DisableCloudSync
                : VaultExtensionMessageType.EnableCloudSync,
            })
          }
          title={cloudSync ? 'Cloud sync enabled — click to disable' : 'Click to enable cloud sync'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          </svg>
          <span>{cloudSync ? 'Synced' : 'Local only'}</span>
        </button>
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
                onUpdateValue={(value) =>
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
                onRename={(newName) =>
                  new Promise((resolve, reject) => {
                    postMessage({ type: VaultExtensionMessageType.RenameSecret, oldName: s.name, newName, environment: s.environment });
                    const unsub = onMessage((msg) => {
                      if (msg.type === VaultWebviewMessageType.SecretRenamed && msg.oldName === s.name && msg.environment === s.environment) {
                        unsub(); resolve();
                      }
                      if (msg.type === VaultWebviewMessageType.SecretDeleted && msg.name === s.name) { unsub(); reject(new Error('deleted')); }
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
