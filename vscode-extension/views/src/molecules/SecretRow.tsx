import React, { useEffect, useRef, useState } from 'react';
import {
  VaultExtensionMessageType,
  VaultWebviewMessageType,
} from '@ext/types';
import { postMessage, onMessage } from '../vscode';
import { unwrapSecret } from '@shared/lib/secrets';
import IconButton from '../atoms/IconButton';
import {
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
} from '../atoms/icons';

type SecretRowProps = {
  name: string;
  environment: string;
  envKey: string;
  onDelete: () => void;
  onUpdateValue: (value: string) => Promise<void>;
  onRename: (newName: string) => Promise<void>;
};

export default function SecretRow({
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
                postMessage({
                  type: VaultExtensionMessageType.OnInfo,
                  message: `Copied "${name}".`,
                }),
              );
            } else {
              setRevealed(plain);
              setTimeout(() => setRevealed(null), 15000);
            }
          })
          .catch(() => {
            postMessage({
              type: VaultExtensionMessageType.OnError,
              message: `Failed to decrypt "${name}".`,
            });
          });
      }
      if (
        msg.type === VaultWebviewMessageType.OperationError &&
        msg.operation === 'fetchSecret'
      ) {
        pendingAction.current = null;
        setFetching(false);
      }
    });
  }, [name, environment, envKey]);

  function toggleReveal() {
    if (revealed) {
      setRevealed(null);
      return;
    }
    pendingAction.current = 'reveal';
    setFetching(true);
    postMessage({
      type: VaultExtensionMessageType.FetchSecret,
      name,
      environment,
    });
  }

  function handleCopy() {
    if (revealed) {
      navigator.clipboard.writeText(revealed).then(() =>
        postMessage({
          type: VaultExtensionMessageType.OnInfo,
          message: `Copied "${name}".`,
        }),
      );
      return;
    }
    pendingAction.current = 'copy';
    setFetching(true);
    postMessage({
      type: VaultExtensionMessageType.FetchSecret,
      name,
      environment,
    });
  }

  function startEditName() {
    setNameDraft(name);
    setEditingName(true);
  }

  async function saveName() {
    const next = nameDraft.trim();
    if (!next || next === name) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(next);
    } finally {
      setSaving(false);
      setEditingName(false);
    }
  }

  function startEditValue() {
    setValueDraft('');
    setEditingValue(true);
  }

  async function saveValue() {
    const next = valueDraft.trim();
    if (!next) {
      setEditingValue(false);
      return;
    }
    setSaving(true);
    try {
      await onUpdateValue(next);
    } finally {
      setSaving(false);
      setEditingValue(false);
      setValueDraft('');
    }
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
            <IconButton
              onClick={saveName}
              disabled={saving || !nameDraft.trim()}
              title="Save name"
              aria-label="Save name"
            >
              {saving ? '...' : '\u2713'}
            </IconButton>
            <IconButton
              onClick={() => setEditingName(false)}
              disabled={saving}
              title="Cancel"
              aria-label="Cancel"
            >
              \u2715
            </IconButton>
          </>
        ) : (
          <>
            <span
              className="secret-name-text"
              onDoubleClick={startEditName}
            >
              {name}
            </span>
            <IconButton
              variant="subtle"
              onClick={startEditName}
              title="Rename"
              aria-label="Rename"
            >
              \u270E
            </IconButton>
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
            <IconButton
              onClick={saveValue}
              disabled={saving || !valueDraft.trim()}
              title="Save value"
              aria-label="Save value"
            >
              {saving ? '...' : '\u2713'}
            </IconButton>
            <IconButton
              onClick={() => setEditingValue(false)}
              disabled={saving}
              title="Cancel"
              aria-label="Cancel"
            >
              \u2715
            </IconButton>
          </>
        ) : (
          <>
            <span
              className={`secret-value-display${revealed ? ' revealed' : ''}`}
            >
              {revealed ?? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
            </span>
            <div className="secret-row-actions">
              <IconButton
                onClick={toggleReveal}
                disabled={fetching}
                title={revealed ? 'Hide' : 'Reveal'}
                aria-label={revealed ? 'Hide' : 'Reveal'}
              >
                {fetching
                  ? '...'
                  : revealed
                    ? <EyeOffIcon />
                    : <EyeIcon />}
              </IconButton>
              <IconButton
                onClick={handleCopy}
                disabled={fetching}
                title="Copy"
                aria-label="Copy"
              >
                \u29C9
              </IconButton>
              <IconButton
                onClick={startEditValue}
                title="Edit value"
                aria-label="Edit value"
              >
                \u270E
              </IconButton>
              {confirmDelete ? (
                <>
                  <IconButton
                    variant="danger"
                    onClick={() => {
                      setConfirmDelete(false);
                      onDelete();
                    }}
                    title="Confirm delete"
                    aria-label="Confirm delete"
                  >
                    \u2713
                  </IconButton>
                  <IconButton
                    onClick={() => setConfirmDelete(false)}
                    title="Cancel"
                    aria-label="Cancel"
                  >
                    \u2715
                  </IconButton>
                </>
              ) : (
                <IconButton
                  variant="danger"
                  onClick={() => setConfirmDelete(true)}
                  title="Delete"
                  aria-label="Delete"
                >
                  <TrashIcon />
                </IconButton>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
