import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Code,
  Collapse,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconChevronRight, IconFilter } from '@tabler/icons-react';
import { VaultInjectOptions } from '@shared/lib/vault-tokens';
import { Detail } from './Detail';

export type ApiKeySummary = {
  id: string;
  name: string;
  expired: boolean;
  revoked: boolean;
  // Absent against a worker that predates claims on the list response,
  // so the row has to read as unknown rather than as unshaped.
  claims?: {
    vaultName: string;
    environment: string;
  } & VaultInjectOptions;
};

const StatusBadge = ({
  expired,
  revoked,
}: Pick<ApiKeySummary, 'expired' | 'revoked'>) => {
  if (revoked)
    return (
      <Badge size={'sm'} color={'red'} variant={'light'}>
        Revoked
      </Badge>
    );

  if (expired)
    return (
      <Badge size={'sm'} color={'gray'} variant={'light'}>
        Expired
      </Badge>
    );

  return (
    <Badge size={'sm'} color={'teal'} variant={'light'}>
      Active
    </Badge>
  );
};

export const ApiKeyRow = ({ apiKey }: { apiKey: ApiKeySummary }) => {
  const [open, setOpen] = useState(false);

  const { name, claims } = apiKey;
  const shaped = Boolean(claims?.prefix || claims?.only?.length);

  return (
    <Stack gap={0} py={2} style={{ minWidth: 0 }}>
      <Group gap={'xs'} wrap={'nowrap'}>
        <ActionIcon
          size={'sm'}
          variant={'subtle'}
          color={'gray'}
          aria-label={`${open ? 'Hide' : 'Show'} claims for ${name}`}
          aria-expanded={open}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          <IconChevronRight
            size={16}
            style={{
              transform: open ? 'rotate(90deg)' : undefined,
              transition: 'transform 150ms ease',
            }}
          />
        </ActionIcon>

        <Text
          size={'sm'}
          ff={'monospace'}
          style={{ flex: 1, minWidth: 0 }}
          truncate
        >
          {name}
        </Text>

        {shaped && (
          <Tooltip label={'Shaped injection'} openDelay={400}>
            <IconFilter
              size={14}
              aria-label={'Shaped injection'}
              style={{
                color: 'var(--mantine-color-dimmed)',
                flexShrink: 0,
              }}
            />
          </Tooltip>
        )}

        <StatusBadge {...apiKey} />
      </Group>

      <Collapse in={open}>
        {claims ? (
          <Group gap={'xl'} align={'flex-start'} pl={34} py={'xs'}>
            <Detail label={'Secrets'}>
              {claims.only?.length ? (
                <Group gap={4}>
                  {claims.only.map((secret) => (
                    <Badge key={secret} size={'xs'} variant={'light'}>
                      {secret}
                    </Badge>
                  ))}
                </Group>
              ) : (
                <Text size={'sm'} c={'dimmed'}>
                  Whole environment
                </Text>
              )}
            </Detail>
            <Detail label={'Prefix'}>
              {claims.prefix ? (
                <Code>{claims.prefix}</Code>
              ) : (
                <Text size={'sm'} c={'dimmed'}>
                  None
                </Text>
              )}
            </Detail>
          </Group>
        ) : (
          <Text size={'sm'} c={'dimmed'} pl={34} py={'xs'}>
            This API does not report what the key injects.
          </Text>
        )}
      </Collapse>
    </Stack>
  );
};
