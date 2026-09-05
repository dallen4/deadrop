import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export const AddRowButton = ({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <Button
    fullWidth
    mt={'xs'}
    size={'sm'}
    variant={'outline'}
    color={'blue.4'}
    opacity={0.7}
    leftSection={<IconPlus size={14} />}
    disabled={disabled}
    onClick={onClick}
  >
    {label}
  </Button>
);
