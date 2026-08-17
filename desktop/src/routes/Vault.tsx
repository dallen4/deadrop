import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
} from '@mantine/core';
import {
  IconAlertCircle,
  IconChevronDown,
  IconCloud,
  IconCloudOff,
  IconFileImport,
  IconPlus,
  IconShare,
} from '@tabler/icons-react';
import { MainWrapper } from '../components/MainWrapper';
import { useVault } from '../hooks/use-vault';
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

export const VaultPage = () => {
  const vault = useVault();
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Only the owner can mint the read-only token a share carries.
  const canShare = vault.cloudSync && vault.ownsActiveCloudVault;

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

  return (
    <MainWrapper>
      <Stack gap={'lg'} w={'100%'}>
        <Group justify={'space-between'}>
          <Group gap={'sm'}>
            <Title order={2}>Vault</Title>
            <Menu>
              <Menu.Target>
                <Button
                  size={'xs'}
                  variant={'light'}
                  rightSection={<IconChevronDown size={14} />}
                >
                  {vault.activeVaultName}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {vaultNames.map((name) => (
                  <Menu.Item
                    key={name}
                    onClick={() => vault.switchVault(name)}
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
          </Group>

          <Group gap={'sm'}>
            {canShare && (
              <Button
                size={'xs'}
                variant={'default'}
                leftSection={<IconShare size={14} />}
                onClick={() => setShareModalOpen(true)}
              >
                Share vault
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
                {vault.cloudSync
                  ? 'Cloud synced'
                  : 'Enable cloud sync'}
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

        <Tabs defaultValue={'secrets'}>
          <Tabs.List mb={'md'}>
            <Tabs.Tab value={'secrets'}>Secrets</Tabs.Tab>
            <Tabs.Tab value={'credentials'}>Credentials</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={'secrets'}>
            <Stack gap={'lg'}>
              <Tabs
                value={vault.activeEnv}
                onChange={(env) => env && vault.switchEnv(env)}
              >
                <Tabs.List>
                  {vault.environments.map((env) => (
                    <Tabs.Tab key={env} value={env}>
                      {env}
                    </Tabs.Tab>
                  ))}
                  <NewEnvironmentInput onAdd={vault.createEnvironment} />
                </Tabs.List>
              </Tabs>

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
                      onReveal={vault.revealSecret}
                      onUpdate={vault.updateSecret}
                      onRename={vault.renameSecret}
                      onDelete={vault.deleteSecret}
                    />
                  ))
                )}
              </Stack>

              <AddSecretForm
                disabled={vault.busy}
                onSubmit={vault.addSecret}
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value={'credentials'}>
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
