import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertTriangle, IconShare } from '@tabler/icons-react';

const EXPIRY_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export const ShareVaultModal = ({
  opened,
  onClose,
  vaultName,
  environments,
  busy,
  onShare,
}: {
  opened: boolean;
  onClose: () => void;
  vaultName: string;
  environments: string[];
  busy: boolean;
  onShare: (envs: string[], expiration: string) => Promise<void>;
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [expiry, setExpiry] = useState('30d');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sharing mints a token before navigating away, so the modal owns its
  // own pending/error state rather than the vault hook's.
  const share = async () => {
    setPending(true);
    setError(null);
    try {
      await onShare(selected, expiry);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Share '${vaultName}'`}
    >
      <Stack gap={'md'}>
        <Checkbox.Group
          label={'Environments to share'}
          value={selected}
          onChange={setSelected}
        >
          <Stack gap={'xs'} mt={'xs'}>
            {environments.map((env) => (
              <Checkbox key={env} value={env} label={env} />
            ))}
          </Stack>
        </Checkbox.Group>

        <Select
          label={'Access expires after'}
          data={EXPIRY_OPTIONS}
          value={expiry}
          onChange={(v) => v && setExpiry(v)}
          allowDeselect={false}
        />

        <Alert color={'yellow'} icon={<IconAlertTriangle size={16} />}>
          The recipient gets read access to every secret in the selected
          environment{selected.length === 1 ? '' : 's'}. Access lapses on
          its own when the token expires.
        </Alert>

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
            leftSection={<IconShare size={14} />}
            disabled={!selected.length}
            loading={busy || pending}
            onClick={() => void share()}
          >
            Share
          </Button>
        </Group>

        {!environments.length && (
          <Text size={'sm'} c={'dimmed'}>
            This vault has no environments to share.
          </Text>
        )}
      </Stack>
    </Modal>
  );
};
