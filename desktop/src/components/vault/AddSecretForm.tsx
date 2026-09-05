import { useState } from 'react';
import { Button, Group, TextInput } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { AddRowButton } from './AddRowButton';

export const AddSecretForm = ({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
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

  if (!open) {
    return (
      <AddRowButton
        label={'Add secret'}
        onClick={() => setOpen(true)}
      />
    );
  }

  return (
    <Group gap={'xs'} mt={'md'} align={'flex-end'}>
      <TextInput
        label={'Name'}
        placeholder={'API_KEY'}
        size={'sm'}
        value={name}
        autoFocus
        onChange={(e) => setName(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSubmit();
          if (e.key === 'Escape') close();
        }}
        style={{ flex: 1 }}
      />
      <TextInput
        label={'Value'}
        placeholder={'secret value'}
        size={'sm'}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSubmit();
          if (e.key === 'Escape') close();
        }}
        style={{ flex: 1 }}
      />
      <Button
        size={'sm'}
        leftSection={<IconPlus size={14} />}
        loading={disabled}
        onClick={() => void handleSubmit()}
      >
        Add
      </Button>
      <Button
        size={'sm'}
        variant={'subtle'}
        color={'gray'}
        onClick={close}
      >
        Cancel
      </Button>
    </Group>
  );
};
