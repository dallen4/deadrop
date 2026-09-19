import { Alert, Code, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import {
  resolveInjectedNames,
  VaultInjectOptions,
} from '@shared/lib/vault-tokens';

// What a shell can reach with `$NAME`. inject spawns the command with an
// env block, so anything else still arrives, just not by expansion.
const SHELL_SAFE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const InjectPreview = ({
  secretNames,
  claims,
}: {
  secretNames: string[];
  // Optional: a worker that predates claims on its responses sends none.
  claims?: VaultInjectOptions;
}) => {
  const names = resolveInjectedNames(secretNames, claims ?? {});

  const unreachable = names.filter((name) => !SHELL_SAFE.test(name));

  if (!names.length)
    return (
      <Text size={'xs'} c={'dimmed'}>
        Nothing to inject yet — this environment has no secrets.
      </Text>
    );

  return (
    <Stack gap={'xs'}>
      <Code block style={{ maxHeight: 180, overflowY: 'auto' }}>
        {names.map((name) => `${name}=...`).join('\n')}
      </Code>
      {unreachable.length > 0 && (
        <Alert
          color={'yellow'}
          icon={<IconAlertTriangle size={16} />}
          p={'xs'}
        >
          <Text size={'xs'}>
            {`$`}-expansion will not reach{' '}
            <Code>{unreachable[0]}</Code>
            {unreachable.length > 1 &&
              ` and ${unreachable.length - 1} more`}{' '}
            in a shell script. A command that reads the environment
            directly still gets them.
          </Text>
        </Alert>
      )}
    </Stack>
  );
};
