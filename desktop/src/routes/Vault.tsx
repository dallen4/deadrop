import { useState } from 'react';
import {
  ActionIcon,
  Alert,
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
} from '@tabler/icons-react';
import { MainWrapper } from '../components/MainWrapper';
import { useVault } from '../hooks/use-vault';
import { AddSecretForm } from '../components/vault/AddSecretForm';
import { CreateVaultModal } from '../components/vault/CreateVaultModal';
import { SecretRow } from '../components/vault/SecretRow';

const NewEnvironmentInput = ({
  onAdd,
}: {
  onAdd: (name: string) => Promise<void>;
}) => {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  if (!adding) {
    return (
      <ActionIcon
        size={'sm'}
        variant={'subtle'}
        onClick={() => setAdding(true)}
      >
        <IconPlus size={14} />
      </ActionIcon>
    );
  }

  const submit = async () => {
    if (name.trim()) await onAdd(name.trim());
    setAdding(false);
    setName('');
  };

  return (
    <TextInput
      size={'xs'}
      w={120}
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
  );
};

export const VaultPage = () => {
  const vault = useVault();
  const [createModalOpen, setCreateModalOpen] = useState(false);

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
              {vault.cloudSync ? 'Cloud synced' : 'Enable cloud sync'}
            </Button>
          </Tooltip>
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

        <AddSecretForm disabled={vault.busy} onSubmit={vault.addSecret} />
      </Stack>

      <CreateVaultModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        canCloudSync={vault.canCloudSync}
        busy={vault.busy}
        onCreate={vault.createVault}
      />
    </MainWrapper>
  );
};
