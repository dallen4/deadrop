import { useState } from 'react';
import {
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  TextInput,
  Tooltip,
} from '@mantine/core';

export const CreateVaultModal = ({
  opened,
  onClose,
  canCloudSync,
  busy,
  onCreate,
}: {
  opened: boolean;
  onClose: () => void;
  canCloudSync: boolean;
  busy: boolean;
  onCreate: (name: string, cloud: boolean) => Promise<void>;
}) => {
  const [name, setName] = useState('');
  const [cloud, setCloud] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await onCreate(name.trim(), cloud);
    setName('');
    setCloud(false);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={'New vault'}>
      <Stack gap={'md'}>
        <TextInput
          label={'Vault name'}
          placeholder={'my-vault'}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          autoFocus
        />
        <Tooltip
          label={'Cloud sync is an early-access feature.'}
          disabled={canCloudSync}
        >
          <Switch
            label={'Enable cloud sync'}
            checked={cloud}
            disabled={!canCloudSync}
            onChange={(e) => setCloud(e.currentTarget.checked)}
          />
        </Tooltip>
        <Group justify={'flex-end'}>
          <Button variant={'subtle'} onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={() => void handleCreate()}>
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
