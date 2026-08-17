import { useEffect, useState } from 'react';
import { Box, Button, Card, Code, Loader, Text } from '@mantine/core';
import DropLog from '../molecules/DropLog';
import { VaultShareCard } from '../molecules/VaultShareCard';
import { GrabState } from '../../lib/constants';
import { DROP_SECRET_VALUE_ID } from '../../lib/dom-ids';
import { tryParseVaultShare } from '../../lib/vault-share';
import type { UseGrabReturn } from '../../hooks/use-grab';
import type { SharedVault } from '../../types/config';

export type GrabFlowProps = {
  // Controller from the shared useGrab hook.
  grab: UseGrabReturn<File>;
  // The drop id to grab — sourced per-platform (web: ?drop= query,
  // desktop: pasted link / deep link).
  dropId: string;
  // Platform file download (web/desktop build an object URL + anchor click).
  onDownloadFile: (file: File) => void;
  // Adopts a grabbed vault share. Omitted on surfaces with no config
  // store (web), where the payload just renders as YAML.
  onSaveVault?: (name: string, vault: SharedVault) => Promise<void>;
};

export const GrabFlow = ({
  grab,
  dropId,
  onDownloadFile,
  onSaveVault,
}: GrabFlowProps) => {
  const { init, status, getLogs, getMode, getSecret } = grab;
  const [secretFile, setSecretFile] = useState<File | null>(null);

  useEffect(() => {
    if (getMode() === 'file' && getSecret())
      setSecretFile(getSecret() as File);
  }, [getSecret()]);

  const downloadSecret = () => {
    onDownloadFile(secretFile!);
  };

  // A vault share identifies itself by parsing cleanly, so detection needs
  // no wire discriminator.
  const secret = getSecret();
  const share =
    getMode() === 'raw' && typeof secret === 'string'
      ? tryParseVaultShare(secret)
      : null;

  const getLoaderText = () => {
    return status === GrabState.Ready
      ? ''
      : status === GrabState.Connected
        ? 'Exchanging secret identities...'
        : GrabState.Waiting
          ? 'Waiting for payload drop...'
          : '';
  };

  return (
    <Box>
      {status === GrabState.Initial ? (
        <>
          <Text>You are about to begin a deadrop.</Text>
          <Button
            id={'begin-grab-btn'}
            onClick={() => init(dropId)}
            disabled={!dropId}
          >
            Begin
          </Button>
        </>
      ) : status === GrabState.Confirmed ? (
        <Box>
          {getMode() === 'raw' ? (
            <>
              {share && onSaveVault && (
                <VaultShareCard
                  name={share.name}
                  vault={share.vault}
                  onSave={onSaveVault}
                />
              )}
              <Code block id={DROP_SECRET_VALUE_ID}>
                {getSecret() as string}
              </Code>
            </>
          ) : (
            <>
              <Text>File received: {(getSecret() as File).name}</Text>
              <Button onClick={downloadSecret}>Download</Button>
            </>
          )}
        </Box>
      ) : (
        <Card>
          <Loader color={'teal'} />
          <Text>{getLoaderText()}</Text>
        </Card>
      )}
      <DropLog logs={getLogs()} />
    </Box>
  );
};
