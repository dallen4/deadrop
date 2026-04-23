import React, { useState } from 'react';

type AddSecretFormProps = {
  activeEnv: string;
  disabled: boolean;
  onSubmit: (name: string, value: string) => void;
};

export default function AddSecretForm({
  activeEnv,
  disabled,
  onSubmit,
}: AddSecretFormProps) {
  const [form, setForm] = useState({ name: '', value: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const value = form.value.trim();
    if (!name || !value || disabled) return;
    onSubmit(name, value);
    setForm({ name: '', value: '' });
  }

  return (
    <form className="vault-add-form" onSubmit={handleSubmit}>
      <div className="vault-add-label">New Secret</div>
      <div className="vault-add-row">
        <input
          className="vault-input"
          placeholder="NAME"
          value={form.name}
          onChange={(e) =>
            setForm((f) => ({ ...f, name: e.target.value }))
          }
          disabled={disabled}
        />
        <input
          className="vault-input"
          placeholder="value"
          type="password"
          value={form.value}
          onChange={(e) =>
            setForm((f) => ({ ...f, value: e.target.value }))
          }
          disabled={disabled}
        />
        <button
          className="vault-btn"
          type="submit"
          disabled={
            !form.name.trim() || !form.value.trim() || disabled
          }
        >
          {disabled ? 'Adding...' : 'Add'}
        </button>
      </div>
    </form>
  );
}
