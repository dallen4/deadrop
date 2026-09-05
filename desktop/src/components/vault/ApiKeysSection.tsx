import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Code,
  CopyButton,
  Divider,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
} from '@tabler/icons-react';
import { useApiKeys } from '../../lib/auth';
import { AddRowButton } from './AddRowButton';
import { TargetDetails } from './TargetDetails';

type ApiKeySummary = {
  id: string;
  name: string;
  expired: boolean;
  revoked: boolean;
};

type IssuedKey = { id: string; name: string; key: string };

const StatusBadge = ({ expired, revoked }: ApiKeySummary) => {
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

export const ApiKeysSection = ({
  vaultName,
  cloudName,
  environment,
}: {
  vaultName: string;
  cloudName?: string;
  environment: string;
}) => {
  const { listApiKeys, createApiKey } = useApiKeys();

  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<IssuedKey | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

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
      const key = await createApiKey({ vaultName, environment });
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
  };

  return (
    <>
      {loading ? (
        <Group gap={'xs'} py={4}>
          <Loader size={'xs'} />
          <Text size={'sm'} c={'dimmed'}>
            Loading API keys…
          </Text>
        </Group>
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
            keys.map((key) => (
              <Group
                key={key.id}
                justify={'space-between'}
                py={4}
                wrap={'nowrap'}
              >
                <Text
                  size={'sm'}
                  ff={'monospace'}
                  style={{ flex: 1, minWidth: 0 }}
                  truncate
                >
                  {key.name}
                </Text>
                <StatusBadge {...key} />
              </Group>
            ))
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
