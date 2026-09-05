import { useState } from 'react';
import {
  Button,
  Code,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { AddRowButton } from './AddRowButton';

const Detail = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <Stack gap={2}>
    <Text size={'xs'} c={'dimmed'} tt={'uppercase'}>
      {label}
    </Text>
    {children}
  </Stack>
);

export const AddSecretForm = ({
  disabled,
  vaultName,
  cloudName,
  environment,
  onSubmit,
}: {
  disabled: boolean;
  vaultName: string;
  cloudName?: string;
  environment: string;
  onSubmit: (name: string, value: string) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  const close = () => {
    setOpen(false);
    setName('');
    setValue('');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !value) return;
    await onSubmit(name.trim(), value);
    close();
  };

  return (
    <>
      <AddRowButton
        label={'Add secret'}
        onClick={() => setOpen(true)}
      />
      <Modal
        centered
        opened={open}
        onClose={close}
        title={'New secret'}
      >
        <Stack gap={'md'}>
          <Group gap={'xl'} align={'flex-start'}>
            <Detail label={'Vault'}>
              <Text size={'sm'} fw={500}>
                {vaultName}
              </Text>
              {cloudName && <Code>{cloudName}</Code>}
            </Detail>
            <Detail label={'Environment'}>
              <Text size={'sm'} fw={500}>
                {environment}
              </Text>
            </Detail>
          </Group>

          <Divider />

          <TextInput
            label={'Name'}
            placeholder={'API_KEY'}
            value={name}
            autoFocus
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSubmit();
            }}
          />
          <TextInput
            label={'Value'}
            placeholder={'secret value'}
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSubmit();
            }}
          />
          <Group justify={'flex-end'}>
            <Button variant={'subtle'} onClick={close}>
              Cancel
            </Button>
            <Button
              loading={disabled}
              onClick={() => void handleSubmit()}
            >
              Add
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
