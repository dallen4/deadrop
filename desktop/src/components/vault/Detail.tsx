import { Stack, Text } from '@mantine/core';

export const Detail = ({
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
