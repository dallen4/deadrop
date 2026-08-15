import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { GrabFlow } from '@shared/components';
import { MainWrapper } from '../components/MainWrapper';
import { GrabState } from '@shared/lib/constants';
import type { SharedVault } from '@shared/types/config';
import { GrabProvider, useGrabContext } from '../contexts/GrabContext';
import { useVault } from '../hooks/use-vault';
import { downloadFile } from '../lib/files';
import { usePeerSessionGuard } from '../lib/session-guard';

// Accepts either a raw drop id or a full grab link (…/grab?drop=<id>).
const extractDropId = (input: string): string => {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    return url.searchParams.get('drop') ?? trimmed;
  } catch {
    return trimmed;
  }
};

type Collision = { name: string; shared: SharedVault };

const GrabInner = ({ dropId }: { dropId: string }) => {
  const grab = useGrabContext();
  const vault = useVault();
  const [collision, setCollision] = useState<Collision | null>(null);
  const [rename, setRename] = useState('');
  // Held open across the rename prompt so the grab card stays pending.
  const pending = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
  } | null>(null);

  usePeerSessionGuard(grab.status === GrabState.Ready);

  // Renaming on import is free — the config key is just a label — while
  // overwriting would discard the existing vault's environment keys.
  const saveVault = (name: string, shared: SharedVault) => {
    if (!vault.config?.vaults[name])
      return vault.adoptVault(name, shared);

    setCollision({ name, shared });
    setRename('');

    return new Promise<void>((resolve, reject) => {
      pending.current = { resolve, reject };
    });
  };

  const confirmRename = async () => {
    const { shared } = collision!;
    setCollision(null);

    try {
      await vault.adoptVault(
        rename.trim() || shared.cloud.name,
        shared,
      );
      pending.current?.resolve();
    } catch (err) {
      pending.current?.reject(err as Error);
    }
  };

  const cancelRename = () => {
    setCollision(null);
    pending.current?.reject(new Error('Vault import cancelled.'));
  };

  return (
    <>
      <GrabFlow
        grab={grab}
        dropId={dropId}
        onDownloadFile={downloadFile}
        onSaveVault={saveVault}
      />

      <Modal
        opened={!!collision}
        onClose={cancelRename}
        title={'Name this vault'}
      >
        <Stack gap={'sm'}>
          <Text size={'sm'}>
            A vault named &apos;{collision?.name}&apos; already
            exists.
          </Text>
          <TextInput
            label={'Local name'}
            placeholder={collision?.shared.cloud.name}
            value={rename}
            onChange={(e) => setRename(e.currentTarget.value)}
          />
          <Group justify={'flex-end'}>
            <Button variant={'default'} onClick={cancelRename}>
              Cancel
            </Button>
            <Button onClick={() => void confirmRename()}>
              Add vault
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export const GrabPage = () => {
  const [params] = useSearchParams();
  const initial = params.get('drop') ?? '';

  const [input, setInput] = useState(initial);
  const [dropId, setDropId] = useState(initial);

  if (!dropId) {
    return (
      <MainWrapper>
        <Stack gap={'sm'} maw={420} mx={'auto'} w={'100%'}>
          <Text>Paste a drop link or id to grab a secret.</Text>
          <TextInput
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder={'drop link or id'}
          />
          <Button
            disabled={!input.trim()}
            onClick={() => setDropId(extractDropId(input))}
          >
            Continue
          </Button>
        </Stack>
      </MainWrapper>
    );
  }

  return (
    <MainWrapper>
      <GrabProvider>
        <GrabInner dropId={dropId} />
      </GrabProvider>
    </MainWrapper>
  );
};
