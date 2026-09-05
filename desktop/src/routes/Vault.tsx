import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Menu,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCertificate,
  IconCheck,
  IconCloud,
  IconCloudOff,
  IconFileImport,
  IconKey,
  IconLockOpen,
  IconPlus,
  IconSelector,
  IconShare,
  IconStack2,
} from '@tabler/icons-react';
import { MainWrapper } from '../components/MainWrapper';
import classes from './Vault.module.css';
import { useVault } from '../hooks/use-vault';
import { AddRowButton } from '../components/vault/AddRowButton';
import { AddSecretForm } from '../components/vault/AddSecretForm';
import { CreateVaultModal } from '../components/vault/CreateVaultModal';
import { CredentialsTab } from '../components/vault/CredentialsTab';
import { SecretRow } from '../components/vault/SecretRow';
import { ShareVaultModal } from '../components/vault/ShareVaultModal';

const NewEnvironmentInput = ({
  onAdd,
}: {
  onAdd: (name: string) => Promise<void>;
}) => {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const submit = async () => {
    if (name.trim()) await onAdd(name.trim());
    setAdding(false);
    setName('');
  };

  // Tabs.List is a flex row sized by the tabs; a bare control in it sits
  // off the tab baseline, so center it and match the tab's height.
  return (
    <Box style={{ alignSelf: 'center' }} ml={4}>
      {adding ? (
        <TextInput
          size={'xs'}
          w={130}
          placeholder={'staging'}
          value={name}
          autoFocus
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
            if (e.key === 'Escape') setAdding(false);
          }}
          onBlur={() => void submit()}
        />
      ) : (
        <Tooltip label={'Add environment'}>
          <ActionIcon
            size={'md'}
            variant={'subtle'}
            color={'gray'}
            aria-label={'Add environment'}
            onClick={() => setAdding(true)}
          >
            <IconPlus size={16} />
          </ActionIcon>
        </Tooltip>
      )}
    </Box>
  );
};

const SECRETS_SECTION = {
  id: 'secrets',
  title: 'Secrets',
};

const API_KEYS_SECTION = {
  id: 'api-keys',
  title: 'API Keys',
};

export const VaultPage = () => {
  const vault = useVault();
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Only the owner can mint the read-only token a share carries, and
  // only an owned cloud vault has API keys to section off.
  const owned = vault.cloudSync && vault.ownsActiveCloudVault;

  // Not !owned — a local vault has no owner and stays writable.
  const readOnly = vault.cloudSync && !vault.ownsActiveCloudVault;

  const shareVault = async (envs: string[], expiration: string) => {
    const payload = await vault.composeShare(envs, expiration);
    setShareModalOpen(false);
    navigate('/drop', {
      state: {
        staged: {
          summary: `Vault: ${vault.activeVaultName} (${envs.join(', ')})`,
          payload,
        },
      },
    });
  };

  if (vault.loading) {
    return (
      <Center mih={'50vh'}>
        <Loader />
      </Center>
    );
  }

  if (!vault.config) {
    return (
      <MainWrapper>
        <Center mih={'50vh'}>
          <Stack gap={'md'} align={'center'}>
            {vault.error && (
              <Alert
                color={'red'}
                icon={<IconAlertCircle size={16} />}
                onClose={() => {}}
              >
                {vault.error}
              </Alert>
            )}
            <Text size={'sm'} c={'dimmed'}>
              You don&apos;t have a vault yet.
            </Text>
            <Group gap={'sm'}>
              <Button
                leftSection={<IconPlus size={14} />}
                onClick={() => setCreateModalOpen(true)}
              >
                Create your vault
              </Button>
              <Button
                variant={'default'}
                leftSection={<IconFileImport size={14} />}
                loading={vault.busy}
                onClick={() => void vault.importVault()}
              >
                Import existing vault
              </Button>
            </Group>
          </Stack>
        </Center>
        <CreateVaultModal
          opened={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          canCloudSync={vault.canCloudSync}
          busy={vault.busy}
          onCreate={vault.createVault}
        />
      </MainWrapper>
    );
  }

  const vaultNames = Object.keys(vault.config?.vaults ?? {});
  const filtered = vault.secretNames.filter(
    (s) => s.environment === vault.activeEnv,
  );

  const secretsSection = (
    <>
      <Stack gap={4}>
        {filtered.length === 0 ? (
          <Text size={'sm'} c={'dimmed'}>
            No secrets yet for <b>{vault.activeEnv}</b>.
          </Text>
        ) : (
          filtered.map((s) => (
            <SecretRow
              key={`${s.environment}:${s.name}`}
              name={s.name}
              environment={s.environment}
              readOnly={readOnly}
              onReveal={vault.revealSecret}
              onUpdate={vault.updateSecret}
              onRename={vault.renameSecret}
              onDelete={vault.deleteSecret}
            />
          ))
        )}
      </Stack>

      {readOnly ? (
        <Text size={'xs'} c={'dimmed'}>
          Shared with you, read-only.
        </Text>
      ) : (
        <AddSecretForm
          disabled={vault.busy}
          vaultName={vault.activeVaultName}
          cloudName={vault.activeVault?.cloud?.name}
          environment={vault.activeEnv}
          onSubmit={vault.addSecret}
        />
      )}
    </>
  );

  return (
    <MainWrapper>
      <Stack gap={'xl'} w={'100%'}>
        <Group justify={'space-between'}>
          <Menu position={'bottom-start'} width={220}>
            <Menu.Target>
              <UnstyledButton aria-label={'Switch vault'}>
                <Group gap={6} wrap={'nowrap'}>
                  <Title order={2}>{vault.activeVaultName}</Title>
                  <IconSelector size={20} stroke={1.5} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              {vaultNames.map((name) => (
                <Menu.Item
                  key={name}
                  onClick={() => vault.switchVault(name)}
                  // The name is the heading now, so the dropdown is the
                  // only place the active vault is marked.
                  rightSection={
                    name === vault.activeVaultName ? (
                      <IconCheck size={14} />
                    ) : undefined
                  }
                >
                  {name}
                </Menu.Item>
              ))}
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconPlus size={14} />}
                onClick={() => setCreateModalOpen(true)}
              >
                New vault
              </Menu.Item>
              <Menu.Item
                leftSection={<IconFileImport size={14} />}
                onClick={() => void vault.importVault()}
              >
                Import vault
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <Group gap={'sm'}>
            {owned && (
              <Button
                size={'xs'}
                variant={'default'}
                leftSection={<IconShare size={14} />}
                onClick={() => setShareModalOpen(true)}
              >
                Share
              </Button>
            )}
            <Tooltip
              label={
                vault.canCloudSync
                  ? undefined
                  : 'Cloud sync is an early-access feature.'
              }
              disabled={vault.canCloudSync}
            >
              <Button
                size={'xs'}
                variant={vault.cloudSync ? 'filled' : 'default'}
                color={vault.cloudSync ? 'teal' : undefined}
                leftSection={
                  vault.cloudSync ? (
                    <IconCloud size={14} />
                  ) : (
                    <IconCloudOff size={14} />
                  )
                }
                disabled={!vault.canCloudSync}
                loading={vault.busy}
                onClick={() => void vault.toggleCloudSync()}
              >
                {vault.cloudSync ? 'Synced' : 'Enable cloud sync'}
              </Button>
            </Tooltip>
          </Group>
        </Group>

        {vault.error && (
          <Alert
            color={'red'}
            icon={<IconAlertCircle size={16} />}
            onClose={() => {}}
          >
            {vault.error}
          </Alert>
        )}

        <Tabs
          defaultValue={'environments'}
          orientation={'vertical'}
          variant={'pills'}
        >
          <Tabs.List
            pr={'md'}
            style={{
              borderRight:
                '1px solid var(--mantine-color-default-border)',
            }}
          >
            <Tabs.Tab
              value={'environments'}
              leftSection={<IconStack2 size={16} />}
            >
              Environments
            </Tabs.Tab>
            <Tabs.Tab
              value={'credentials'}
              leftSection={<IconCertificate size={16} />}
            >
              Credentials
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={'environments'}>
            <Stack gap={'sm'} pl={'md'}>
              <Tabs
                value={vault.activeEnv}
                onChange={(env) => env && vault.switchEnv(env)}
                classNames={{ root: classes.envTabs }}
              >
                <Tabs.List>
                  {vault.environments.map((env) => (
                    <Tabs.Tab key={env} value={env}>
                      {env}
                    </Tabs.Tab>
                  ))}
                  {!readOnly && (
                    <NewEnvironmentInput
                      onAdd={vault.createEnvironment}
                    />
                  )}
                </Tabs.List>
              </Tabs>

              {owned ? (
                <Accordion
                  multiple
                  classNames={{ control: classes.sectionControl }}
                  defaultValue={[
                    SECRETS_SECTION.id,
                    API_KEYS_SECTION.id,
                  ]}
                >
                  <Accordion.Item value={SECRETS_SECTION.id}>
                    <Accordion.Control
                      icon={<IconLockOpen size={20} />}
                    >
                      {SECRETS_SECTION.title}
                    </Accordion.Control>
                    <Accordion.Panel>
                      {secretsSection}
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value={API_KEYS_SECTION.id}>
                    <Accordion.Control icon={<IconKey size={20} />}>
                      {API_KEYS_SECTION.title}
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Text size={'sm'} c={'dimmed'}>
                        No API keys yet for <b>{vault.activeEnv}</b>.
                      </Text>
                      {/* Issuing keys isn't wired up yet. */}
                      <AddRowButton
                        label={'Add API key'}
                        onClick={() => {}}
                      />
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              ) : (
                secretsSection
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value={'credentials'} pl={'md'}>
            <CredentialsTab
              vaultName={vault.activeVaultName}
              cloudName={vault.activeVault?.cloud?.name}
              authToken={vault.activeVault?.cloud?.authToken}
              owned={vault.ownsActiveCloudVault}
              busy={vault.busy}
              onIssue={vault.issueToken}
              onSaveToken={vault.saveCloudToken}
              onRotate={vault.rotateTokens}
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <CreateVaultModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        canCloudSync={vault.canCloudSync}
        busy={vault.busy}
        onCreate={vault.createVault}
      />

      <ShareVaultModal
        opened={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        vaultName={vault.activeVaultName}
        environments={vault.environments}
        busy={vault.busy}
        onShare={shareVault}
      />
    </MainWrapper>
  );
};
