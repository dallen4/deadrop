import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  PasswordInput,
  Stack,
  TextInput,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

export const EditSecretModal = ({
  opened,
  onClose,
  name,
  environment,
  onReveal,
  onUpdate,
  onRename,
}: {
  opened: boolean;
  onClose: () => void;
  name: string;
  environment: string;
  onReveal: (name: string, environment: string) => Promise<string>;
  onUpdate: (
    name: string,
    environment: string,
    value: string,
  ) => Promise<void>;
  onRename: (
    oldName: string,
    newName: string,
    environment: string,
  ) => Promise<void>;
}) => {
  const [nameValue, setNameValue] = useState(name);
  const [value, setValue] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The value only exists encrypted at rest, so the form fills in from a
  // decrypt each time it opens rather than from the row's props.
  useEffect(() => {
    if (!opened) return;
    setNameValue(name);
    setError(null);
    setLoading(true);
    onReveal(name, environment)
      .then((secret) => {
        setValue(secret);
        setOriginal(secret);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [opened, name, environment, onReveal]);

  const trimmedName = nameValue.trim();
  const renamed = !!trimmedName && trimmedName !== name;
  const revalued = value !== original;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (revalued) await onUpdate(name, environment, value);
      if (renamed) await onRename(name, trimmedName, environment);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={'Edit secret'}>
      <Stack gap={'md'}>
        <TextInput
          label={'Name'}
          value={nameValue}
          onChange={(e) => setNameValue(e.currentTarget.value)}
          autoFocus
        />
        <PasswordInput
          label={'Value'}
          // A monospace family alone renders larger than the name field;
          // pin the size so the two inputs match.
          styles={{
            innerInput: {
              fontFamily: 'monospace',
              fontSize: 'var(--mantine-font-size-sm)',
            },
          }}
          value={value}
          disabled={loading}
          onChange={(e) => setValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
          }}
        />

        {error && (
          <Alert color={'red'} icon={<IconAlertTriangle size={16} />}>
            {error}
          </Alert>
        )}

        <Group justify={'flex-end'}>
          <Button variant={'default'} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={loading || (!renamed && !revalued)}
            loading={saving}
            onClick={() => void save()}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
