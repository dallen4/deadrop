import React, { useState } from 'react';

export type ToastEntry = {
  id: number;
  message: string;
  kind: 'success' | 'error';
};

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  function show(
    message: string,
    kind: ToastEntry['kind'] = 'success',
  ) {
    const id = ++nextId;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      3000,
    );
  }

  return { toasts, show };
}

export function ToastContainer({
  toasts,
}: {
  toasts: ToastEntry[];
}) {
  if (!toasts.length) return null;
  return (
    <div className="vault-toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`vault-toast vault-toast-${t.kind}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
