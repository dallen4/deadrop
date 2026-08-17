import { useState } from 'react';
import { Alert, Button, Card, Stack, Text } from '@mantine/core';
import type { SharedVault } from '../../types/config';

export type VaultShareCardProps = {
  name: string;
  vault: SharedVault;
  // Writes the vault into the platform's config store.
  onSave: (name: string, vault: SharedVault) => Promise<void>;
};

export const VaultShareCard = ({
  name,
  vault,
  onSave,
}: VaultShareCardProps) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const environments = Object.keys(vault.environments);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(name, vault);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card withBorder>
      <Stack gap={'sm'}>
        <Text fw={'bold'}>Vault: {name}</Text>
        <Text size={'sm'} c={'dimmed'}>
          {environments.length
            ? `Environments: ${environments.join(', ')}`
            : 'No environments shared.'}
        </Text>

        {error && <Alert color={'red'}>{error}</Alert>}

        {saved ? (
          <Alert color={'teal'}>Added to your vaults.</Alert>
        ) : (
          <Button loading={saving} onClick={() => void save()}>
            Add to my vaults
          </Button>
        )}
      </Stack>
    </Card>
  );
};
