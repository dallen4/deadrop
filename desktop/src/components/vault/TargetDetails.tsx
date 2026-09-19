import { Code, Group, Text } from '@mantine/core';
import { Detail } from './Detail';

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
