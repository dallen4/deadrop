import { Code, Group, Stack, Text } from '@mantine/core';

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

export const TargetDetails = ({
  vaultName,
  cloudName,
  environment,
}: {
  vaultName: string;
  cloudName?: string;
  environment: string;
}) => (
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
);
