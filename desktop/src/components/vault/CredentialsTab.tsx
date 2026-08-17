import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Code,
  CopyButton,
  Divider,
  Group,
  Modal,
  Radio,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconKey,
  IconRefreshAlert,
} from '@tabler/icons-react';
import { VaultTokenAccess } from '@shared/lib/constants';
import { appConfigPath } from '../../lib/vault-config';

const EXPIRY_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'never', label: 'Never' },
];

const mask = (token: string) =>
  `${token.slice(0, 8)}${'•'.repeat(24)}${token.slice(-6)}`;

const TokenValue = ({ token }: { token: string }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <Group gap={'xs'} wrap={'nowrap'}>
      <Code style={{ flex: 1, wordBreak: 'break-all' }}>
        {revealed ? token : mask(token)}
      </Code>
      <Button
        size={'compact-xs'}
        variant={'subtle'}
        leftSection={
          revealed ? <IconEyeOff size={14} /> : <IconEye size={14} />
        }
        onClick={() => setRevealed((r) => !r)}
      >
        {revealed ? 'Hide' : 'Reveal'}
      </Button>
      <CopyButton value={token}>
        {({ copied, copy }) => (
          <Button
            size={'compact-xs'}
            variant={'subtle'}
            color={copied ? 'teal' : undefined}
            leftSection={
              copied ? <IconCheck size={14} /> : <IconCopy size={14} />
            }
            onClick={copy}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </CopyButton>
    </Group>
  );
};

export const CredentialsTab = ({
  vaultName,
  cloudName,
  authToken,
  owned,
  busy,
  onIssue,
  onSaveToken,
  onRotate,
}: {
  vaultName: string;
  cloudName?: string;
  authToken?: string;
  owned: boolean;
  busy: boolean;
  onIssue: (
    access: VaultTokenAccess,
    expiration?: string,
  ) => Promise<string>;
  onSaveToken: (token: string) => Promise<void>;
  onRotate: () => Promise<void>;
}) => {
  const [configPath, setConfigPath] = useState('');
  const [access, setAccess] = useState<VaultTokenAccess>(
    VaultTokenAccess.ReadOnly,
  );
  const [expiry, setExpiry] = useState<string>('30d');
  const [label, setLabel] = useState('');
  const [issued, setIssued] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => {
    appConfigPath().then(setConfigPath);
  }, []);

  if (!cloudName) {
    return (
      <Text size={'sm'} c={'dimmed'}>
        This vault is local only. Enable cloud sync to manage
        credentials.
      </Text>
    );
  }

  const issue = async () => {
    setIssueError(null);
    setIssued(null);
    try {
      setIssued(
        await onIssue(
          access,
          expiry === 'never' ? undefined : expiry,
        ),
      );
    } catch (err) {
      setIssueError((err as Error).message);
    }
  };

  const rotate = async () => {
    setRotateOpen(false);
    setConfirmName('');
    setIssued(null);
    await onRotate();
  };

  return (
    <Stack gap={'lg'}>
      <Stack gap={'xs'}>
        <Title order={5}>Current sync token</Title>
        {authToken ? (
          <>
            <TokenValue token={authToken} />
            <Text size={'xs'} c={'dimmed'}>
              Stored in plaintext in <Code>{configPath}</Code>
            </Text>
          </>
        ) : (
          <Text size={'sm'} c={'dimmed'}>
            No token stored for this vault.
          </Text>
        )}
      </Stack>

      {!owned && (
        <Alert
          color={'yellow'}
          icon={<IconAlertTriangle size={16} />}
          title={'You do not own this vault'}
        >
          Tokens for <Code>{cloudName}</Code> can only be issued by its
          owner. Keep the token above safe — if the owner rotates their
          vault, you lose access until they send you a new one out of
          band.
        </Alert>
      )}

      {owned && (
        <>
          <Divider />

          <Stack gap={'sm'}>
            <Title order={5}>Issue a new token</Title>

            <Radio.Group
              value={access}
              onChange={(v) => setAccess(v as VaultTokenAccess)}
              label={'Access'}
            >
              <Group gap={'lg'} mt={'xs'}>
                <Radio
                  value={VaultTokenAccess.ReadOnly}
                  label={'Read only'}
                />
                <Radio
                  value={VaultTokenAccess.FullAccess}
                  label={'Full access'}
                />
              </Group>
            </Radio.Group>

            <Group align={'end'} gap={'sm'}>
              <Select
                label={'Expires'}
                data={EXPIRY_OPTIONS}
                value={expiry}
                onChange={(v) => v && setExpiry(v)}
                w={140}
                allowDeselect={false}
              />
              <TextInput
                label={'Label (optional)'}
                description={'Shown here only, never sent to Turso'}
                placeholder={'ci-pipeline'}
                value={label}
                onChange={(e) => setLabel(e.currentTarget.value)}
                flex={1}
              />
              <Button
                leftSection={<IconKey size={14} />}
                loading={busy}
                onClick={() => void issue()}
              >
                Issue
              </Button>
            </Group>

            {expiry === 'never' && (
              <Text size={'xs'} c={'orange'}>
                Tokens that never expire can only be revoked by rotating
                the whole vault.
              </Text>
            )}

            {issueError && (
              <Alert color={'red'} icon={<IconAlertTriangle size={16} />}>
                {issueError}
              </Alert>
            )}

            {issued && (
              <Alert
                color={'teal'}
                title={`New token${label ? ` (${label})` : ''}`}
              >
                <Stack gap={'xs'}>
                  <Text size={'sm'} fw={600}>
                    Copy it now — you will not see this again.
                  </Text>
                  <TokenValue token={issued} />
                  <Group>
                    <Button
                      size={'xs'}
                      variant={'light'}
                      loading={busy}
                      onClick={() => void onSaveToken(issued)}
                    >
                      Save as this vault&apos;s sync token
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            )}
          </Stack>

          <Divider />

          <Stack gap={'sm'}>
            <Title order={5}>Rotate all tokens</Title>
            <Text size={'sm'} c={'dimmed'}>
              Turso cannot revoke a single token, so this invalidates
              every token for <Code>{cloudName}</Code>. The CLI, the VS
              Code extension, and anyone you have shared this vault with
              all lose access until they get a new token out of band.
              Bounded expiry is the routine path; this is break-glass.
            </Text>
            <Group>
              <Button
                color={'red'}
                variant={'light'}
                leftSection={<IconRefreshAlert size={14} />}
                onClick={() => setRotateOpen(true)}
              >
                Rotate tokens
              </Button>
            </Group>
          </Stack>
        </>
      )}

      <Modal
        opened={rotateOpen}
        onClose={() => setRotateOpen(false)}
        title={'Rotate every token for this vault?'}
      >
        <Stack gap={'md'}>
          <Text size={'sm'}>
            This app will immediately mint and store a replacement so
            your own sync keeps working. Every other token stops working
            right away.
          </Text>
          <TextInput
            label={`Type "${vaultName}" to confirm`}
            value={confirmName}
            onChange={(e) => setConfirmName(e.currentTarget.value)}
            autoFocus
          />
          <Group justify={'flex-end'}>
            <Button
              variant={'default'}
              onClick={() => setRotateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color={'red'}
              disabled={confirmName !== vaultName}
              loading={busy}
              onClick={() => void rotate()}
            >
              Rotate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
