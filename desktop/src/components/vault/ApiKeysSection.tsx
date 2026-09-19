import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Code,
  Collapse,
  CopyButton,
  Divider,
  Group,
  Modal,
  MultiSelect,
  Skeleton,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconChevronRight,
  IconCopy,
} from '@tabler/icons-react';
import { useApiKeys } from '../../lib/auth';
import { AddRowButton } from './AddRowButton';
import { TargetDetails } from './TargetDetails';
import { ApiKeyRow, ApiKeySummary } from './ApiKeyRow';
import { InjectPreview } from './InjectPreview';

type IssuedKey = {
  id: string;
  name: string;
  key: string;
  claims?: { prefix?: string; only?: string[] };
};

export const ApiKeysSection = ({
  vaultName,
  cloudName,
  environment,
  secretNames,
}: {
  vaultName: string;
  cloudName?: string;
  environment: string;
  secretNames: string[];
}) => {
  const { listApiKeys, createApiKey } = useApiKeys();

  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<IssuedKey | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  const [shaping, setShaping] = useState(false);
  const [only, setOnly] = useState<string[]>([]);
  const [prefix, setPrefix] = useState('');

  useEffect(() => {
    let stale = false;

    setLoading(true);
    setError(null);

    listApiKeys({ vaultName, environment })
      .then((loaded) => {
        if (!stale) setKeys(loaded);
      })
      .catch((err: Error) => {
        if (!stale) setError(err.message);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });

    return () => {
      stale = true;
    };
    // The hook's callbacks are recreated per render, so the vault
    // target is what actually decides when to refetch.
  }, [vaultName, environment]);

  const issue = async () => {
    setIssuing(true);
    setIssueError(null);
    try {
      const key = await createApiKey(
        { vaultName, environment },
        { only, prefix: prefix.trim() || undefined },
      );
      setIssued(key);
      setKeys(await listApiKeys({ vaultName, environment }));
    } catch (err) {
      setIssueError((err as Error).message);
    } finally {
      setIssuing(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setIssued(null);
    setIssueError(null);
    setShaping(false);
    setOnly([]);
    setPrefix('');
  };

  return (
    <>
      {loading ? (
        <Stack gap={4}>
          {/* Match the row height so the list does not jump when it resolves. */}
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} height={26} my={2} radius={'sm'} />
          ))}
        </Stack>
      ) : error ? (
        <Alert color={'red'} icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      ) : (
        <Stack gap={4}>
          {keys.length === 0 ? (
            <Text size={'sm'} c={'dimmed'}>
              No API keys yet for <b>{environment}</b>.
            </Text>
          ) : (
            keys.map((key) => <ApiKeyRow key={key.id} apiKey={key} />)
          )}
        </Stack>
      )}

      <AddRowButton
        label={'Add API key'}
        onClick={() => setModalOpen(true)}
      />

      <Modal
        centered
        opened={modalOpen}
        onClose={closeModal}
        title={issued ? 'API key created' : 'New API key'}
      >
        <Stack gap={'md'}>
          <TargetDetails
            vaultName={vaultName}
            cloudName={cloudName}
            environment={environment}
          />

          <Divider />

          {issued ? (
            <>
              <Text size={'sm'}>
                Copy <Code>{issued.name}</Code> now — this is the only
                time the key is shown.
              </Text>
              <Code block style={{ wordBreak: 'break-all' }}>
                {issued.key}
              </Code>
              <Text size={'xs'} c={'dimmed'} tt={'uppercase'}>
                Injects
              </Text>
              <InjectPreview
                secretNames={secretNames}
                claims={issued.claims}
              />
              <Group justify={'flex-end'}>
                <CopyButton value={issued.key}>
                  {({ copied, copy }) => (
                    <Button
                      variant={'default'}
                      color={copied ? 'teal' : undefined}
                      leftSection={
                        copied ? (
                          <IconCheck size={14} />
                        ) : (
                          <IconCopy size={14} />
                        )
                      }
                      onClick={copy}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </CopyButton>
                <Button onClick={closeModal}>Done</Button>
              </Group>
            </>
          ) : (
            <>
              <Text size={'sm'} c={'dimmed'}>
                Mints a key scoped to this vault and environment, for
                injecting secrets into CI/CD.
              </Text>

              <UnstyledButton
                onClick={() => setShaping((was) => !was)}
                aria-expanded={shaping}
              >
                <Group gap={4}>
                  <IconChevronRight
                    size={14}
                    style={{
                      transform: shaping
                        ? 'rotate(90deg)'
                        : undefined,
                      transition: 'transform 150ms ease',
                    }}
                  />
                  <Text size={'sm'} fw={500}>
                    Shape injection (optional)
                  </Text>
                </Group>
              </UnstyledButton>

              <Collapse in={shaping}>
                <Stack gap={'sm'}>
                  <MultiSelect
                    label={'Secrets'}
                    placeholder={
                      only.length ? undefined : 'Whole environment'
                    }
                    description={
                      secretNames.length
                        ? 'Shapes what inject writes; it does not limit what the key can read.'
                        : 'No secrets in this environment yet.'
                    }
                    data={secretNames}
                    value={only}
                    onChange={setOnly}
                    disabled={!secretNames.length}
                    clearable
                    searchable
                  />
                  <TextInput
                    label={'Prefix'}
                    placeholder={'DB_'}
                    description={
                      'Prepended to every variable name the key injects, overriding inject --prefix.'
                    }
                    value={prefix}
                    onChange={(event) =>
                      setPrefix(event.currentTarget.value)
                    }
                  />
                  <Stack gap={4}>
                    <Text size={'xs'} c={'dimmed'} tt={'uppercase'}>
                      Injects
                    </Text>
                    <InjectPreview
                      secretNames={secretNames}
                      claims={{
                        only: only.length ? only : undefined,
                        prefix: prefix.trim() || undefined,
                      }}
                    />
                  </Stack>
                </Stack>
              </Collapse>

              {issueError && (
                <Alert
                  color={'red'}
                  icon={<IconAlertCircle size={16} />}
                >
                  {issueError}
                </Alert>
              )}
              <Group justify={'flex-end'}>
                <Button variant={'subtle'} onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  loading={issuing}
                  onClick={() => void issue()}
                >
                  Create
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
};
