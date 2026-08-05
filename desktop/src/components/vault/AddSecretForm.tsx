import { useState } from 'react';
import { Button, Group, TextInput } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export const AddSecretForm = ({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (name: string, value: string) => Promise<void>;
}) => {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !value) return;
    await onSubmit(name.trim(), value);
    setName('');
    setValue('');
  };

  return (
    <Group gap={'xs'} mt={'md'} align={'flex-end'}>
      <TextInput
        label={'Name'}
        placeholder={'API_KEY'}
        size={'sm'}
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        style={{ flex: 1 }}
      />
      <TextInput
        label={'Value'}
        placeholder={'secret value'}
        size={'sm'}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
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
    </Group>
  );
};
