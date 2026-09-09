import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react';

export const DeleteCloudVaultModal = ({
  opened,
  onClose,
  vaultName,
  busy,
  onDelete,
}: {
  opened: boolean;
  onClose: () => void;
  vaultName: string;
  busy: boolean;
  onDelete: () => Promise<void>;
}) => {
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setConfirmation('');
      setError(null);
    }
  }, [opened]);

  const remove = async () => {
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Delete cloud copy of '${vaultName}'`}
    >
      <Stack gap={'md'}>
        <Alert color={'red'} icon={<IconAlertTriangle size={16} />}>
          This permanently deletes the cloud database, every secret in
          it, and every sync token minted from it, for you and
          everyone you&apos;ve shared it with. It cannot be undone.
        </Alert>

        <Text size={'sm'} c={'dimmed'}>
          The copy on this machine is left alone, and the vault keeps
          working locally. If you only want to stop syncing, close
          this and click <b>Synced</b> instead.
        </Text>

        <TextInput
          label={`Type '${vaultName}' to confirm`}
          value={confirmation}
          onChange={(e) => setConfirmation(e.currentTarget.value)}
          autoFocus
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
            color={'red'}
            leftSection={<IconTrash size={14} />}
            disabled={confirmation !== vaultName}
            loading={busy}
            onClick={() => void remove()}
          >
            Delete cloud vault
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
