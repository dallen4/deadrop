import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Stack, Text, TextInput } from '@mantine/core';
import { GrabFlow } from '@shared/components';
import { MainWrapper } from '../components/MainWrapper';
import { GrabState } from '@shared/lib/constants';
import { GrabProvider, useGrabContext } from '../contexts/GrabContext';
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

const GrabInner = ({ dropId }: { dropId: string }) => {
  const grab = useGrabContext();

  usePeerSessionGuard(grab.status === GrabState.Ready);

  return (
    <GrabFlow
      grab={grab}
      dropId={dropId}
      onDownloadFile={downloadFile}
    />
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
