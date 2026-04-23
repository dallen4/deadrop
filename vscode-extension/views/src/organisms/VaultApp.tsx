import React, { useEffect, useRef, useState } from 'react';
import type { ExtensionConfig } from '@ext/types';
import {
  VaultExtensionMessageType,
  VaultWebviewMessageType,
} from '@ext/types';
import { postMessage, onMessage } from '../vscode';
import { ToastContainer, useToast } from '../atoms/Toast';
import VaultCreate from '../molecules/VaultCreate';
import CloudSyncButton from '../molecules/CloudSyncButton';
import EnvSidebar from '../molecules/EnvSidebar';
import SecretRow from '../molecules/SecretRow';
import AddSecretForm from '../molecules/AddSecretForm';

type SecretEntry = { name: string; environment: string };

export default function VaultApp() {
  const [config, setConfig] = useState<ExtensionConfig | null>(
    null,
  );
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [environments, setEnvironments] = useState<
    Record<string, string>
  >({});
  const [activeEnv, setActiveEnv] = useState('');
  const [cloudSync, setCloudSync] = useState(false);
  const [canCloudSync, setCanCloudSync] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [addingEnv, setAddingEnv] = useState(false);
  const [addingSecret, setAddingSecret] = useState(false);
  const configRef = useRef<ExtensionConfig | null>(null);
  const { toasts, show: showToast } = useToast();

  useEffect(() => {
    postMessage({ type: VaultExtensionMessageType.Ready });
    return onMessage((msg) => {
      switch (msg.type) {
        case VaultWebviewMessageType.Init: {
          configRef.current = msg.config;
          setConfig(msg.config);
          setCloudSync(!!msg.config.cloudSync);
          setCanCloudSync(!!msg.config.canCloudSync);
          const envs =
            msg.config.vaultEnvironmentKeys ?? {};
          setEnvironments(envs);
          setActiveEnv(Object.keys(envs)[0] ?? '');
          break;
        }
        case VaultWebviewMessageType.SecretNames:
          setSecrets(msg.names);
          break;
        case VaultWebviewMessageType.SecretAdded:
          setSecrets((prev) => [
            ...prev,
            { name: msg.name, environment: msg.environment },
          ]);
          setAddingSecret(false);
          showToast(`Secret "${msg.name}" added.`);
          break;
        case VaultWebviewMessageType.SecretUpdated:
          showToast(`Secret "${msg.name}" updated.`);
          break;
        case VaultWebviewMessageType.SecretRenamed:
          setSecrets((prev) =>
            prev.map((s) =>
              s.name === msg.oldName &&
              s.environment === msg.environment
                ? {
                    name: msg.newName,
                    environment: msg.environment,
                  }
                : s,
            ),
          );
          showToast(`Renamed to "${msg.newName}".`);
          break;
        case VaultWebviewMessageType.SecretDeleted:
          setSecrets((prev) =>
            prev.filter(
              (s) =>
                !(
                  s.name === msg.name &&
                  s.environment === msg.environment
                ),
            ),
          );
          showToast(`Secret "${msg.name}" deleted.`);
          break;
        case VaultWebviewMessageType.CloudSyncEnabled:
          setCloudSync(true);
          setCloudSyncing(false);
          showToast('Cloud sync enabled.');
          break;
        case VaultWebviewMessageType.CloudSyncDisabled:
          setCloudSync(false);
          setCloudSyncing(false);
          showToast('Cloud sync disabled.');
          break;
        case VaultWebviewMessageType.EnvironmentCreated: {
          const { name, key } = msg;
          setEnvironments((prev) => ({
            ...prev,
            [name]: key,
          }));
          if (configRef.current) {
            configRef.current = {
              ...configRef.current,
              vaultEnvironmentKeys: {
                ...configRef.current.vaultEnvironmentKeys,
                [name]: key,
              },
            };
          }
          setActiveEnv(name);
          setAddingEnv(false);
          showToast(`Environment "${name}" created.`);
          break;
        }
        case VaultWebviewMessageType.OperationError: {
          if (msg.operation === 'addSecret')
            setAddingSecret(false);
          if (msg.operation === 'createEnvironment')
            setAddingEnv(false);
          if (
            msg.operation === 'enableCloudSync' ||
            msg.operation === 'disableCloudSync'
          )
            setCloudSyncing(false);
          showToast(msg.message, 'error');
          break;
        }
      }
    });
  }, []);

  if (!config)
    return <div className="vault-loading">Loading...</div>;
  if (!config.vaultEnvironmentKeys)
    return <VaultCreate canCloudSync={canCloudSync} />;

  const envList = Object.keys(environments);
  const filtered = secrets.filter(
    (s) => s.environment === activeEnv,
  );
  const envKey = environments[activeEnv] ?? '';

  function handleCloudSyncToggle() {
    if (cloudSyncing) return;
    setCloudSyncing(true);
    postMessage({
      type: cloudSync
        ? VaultExtensionMessageType.DisableCloudSync
        : VaultExtensionMessageType.EnableCloudSync,
    });
  }

  function handleAddSecret(name: string, value: string) {
    setAddingSecret(true);
    postMessage({
      type: VaultExtensionMessageType.AddSecret,
      name,
      value,
      environment: activeEnv,
    });
  }

  function handleAddEnv(name: string) {
    setAddingEnv(true);
    postMessage({
      type: VaultExtensionMessageType.CreateEnvironment,
      name,
    });
  }

  return (
    <div className="vault-layout-outer">
      <ToastContainer toasts={toasts} />
      <div className="vault-layout">
        {/* Header */}
        <header className="vault-header">
          <div className="vault-header-left">
            <span className="vault-header-title">
              deadrop vault
            </span>
            {config.vaultName && (
              <span
                className="vault-header-name"
                data-tooltip={config.vaultLocation ?? ''}
              >
                {config.vaultName}
              </span>
            )}
          </div>
          <CloudSyncButton
            cloudSync={cloudSync}
            canCloudSync={canCloudSync}
            syncing={cloudSyncing}
            onToggle={handleCloudSyncToggle}
            onLocked={() =>
              showToast(
                'Cloud sync is a premium feature. Upgrade at deadrop.io to enable it.',
                'error',
              )
            }
          />
        </header>

        {/* Two-column body */}
        <div className="vault-body">
          <EnvSidebar
            envList={envList}
            activeEnv={activeEnv}
            secrets={secrets}
            addingEnv={addingEnv}
            onSelectEnv={setActiveEnv}
            onAddEnv={handleAddEnv}
          />

          <main className="vault-main">
            <div className="vault-main-header">
              <h1 className="vault-main-title">{activeEnv}</h1>
              <span className="vault-main-count">
                {filtered.length} secret
                {filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="vault-secret-list">
              {filtered.length === 0 ? (
                <p className="vault-empty-msg">
                  No secrets yet for{' '}
                  <strong>{activeEnv}</strong>.
                </p>
              ) : (
                filtered.map((s) => (
                  <SecretRow
                    key={`${s.environment}:${s.name}`}
                    name={s.name}
                    environment={s.environment}
                    envKey={envKey}
                    onDelete={() =>
                      postMessage({
                        type: VaultExtensionMessageType.DeleteSecret,
                        name: s.name,
                        environment: s.environment,
                      })
                    }
                    onUpdateValue={(value) =>
                      new Promise((resolve, reject) => {
                        postMessage({
                          type: VaultExtensionMessageType.UpdateSecret,
                          name: s.name,
                          value,
                          environment: s.environment,
                        });
                        const unsub = onMessage((msg) => {
                          if (
                            msg.type ===
                              VaultWebviewMessageType.SecretUpdated &&
                            msg.name === s.name &&
                            msg.environment === s.environment
                          ) {
                            unsub();
                            resolve();
                          }
                          if (
                            msg.type ===
                            VaultWebviewMessageType.OperationError &&
                            msg.operation === 'updateSecret'
                          ) {
                            unsub();
                            reject(new Error(msg.message));
                          }
                        });
                      })
                    }
                    onRename={(newName) =>
                      new Promise((resolve, reject) => {
                        postMessage({
                          type: VaultExtensionMessageType.RenameSecret,
                          oldName: s.name,
                          newName,
                          environment: s.environment,
                        });
                        const unsub = onMessage((msg) => {
                          if (
                            msg.type ===
                              VaultWebviewMessageType.SecretRenamed &&
                            msg.oldName === s.name &&
                            msg.environment === s.environment
                          ) {
                            unsub();
                            resolve();
                          }
                          if (
                            msg.type ===
                            VaultWebviewMessageType.OperationError &&
                            msg.operation === 'renameSecret'
                          ) {
                            unsub();
                            reject(new Error(msg.message));
                          }
                        });
                      })
                    }
                  />
                ))
              )}
            </div>

            <AddSecretForm
              activeEnv={activeEnv}
              disabled={addingSecret}
              onSubmit={handleAddSecret}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
