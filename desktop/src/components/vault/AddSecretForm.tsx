import { useState } from 'react';
import {
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  TextInput,
} from '@mantine/core';
import { AddRowButton } from './AddRowButton';
import { TargetDetails } from './TargetDetails';

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
          <TargetDetails
            vaultName={vaultName}
            cloudName={cloudName}
            environment={environment}
          />

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
