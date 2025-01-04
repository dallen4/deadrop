import { useRef, useState } from 'react';
import {
  Box,
  Button,
  FileButton,
  JsonInput,
  PasswordInput,
  SegmentedControl,
  Text,
  useMantineTheme,
} from '@mantine/core';
import {
  ACCEPTED_FILE_TYPES,
  MAX_PAYLOAD_SIZE,
} from '@shared/config/files';
import type { PayloadInputMode } from '@shared/types/common';
import { Captcha } from 'atoms/Captcha';
import { useDropContext } from 'contexts/DropContext';
import { CONFIRM_PAYLOAD_BTN_ID } from 'lib/constants';
import StepCard from './StepCard';

export const SecretInputCard = () => {
  const [mode, setMode] = useState<PayloadInputMode>('text');
  const [isValid, setIsValid] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [canConfirm, setCanConfirm] = useState(
    process.env.NODE_ENV === 'development',
  );

  const textRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLTextAreaElement>(null);

  const theme = useMantineTheme();

  const { setPayload } = useDropContext();

  const isValidJson = (input: string) => {
    try {
      JSON.parse(input);

      return true;
    } catch {
      return false;
    }
  };

  const validateOnChange = (
    inputMode: PayloadInputMode,
    value: string | File | null,
  ) => {
    if (inputMode === 'file') {
      const file = value as File | null;

      if (!file || file.size > MAX_PAYLOAD_SIZE) {
        setIsValid(false);
        setFile(null);

        alert('This file is too big');
        return;
      }

      setIsValid(true);
      setFile(value as File);
    } else if (inputMode === 'json')
      setIsValid(isValidJson(value as string));
    else setIsValid((value as string).length > 0);
  };

  const confirmPayload = async () => {
    if (mode === 'text') setPayload(textRef.current!.value, 'raw');
    else if (mode === 'json')
      setPayload(jsonRef.current!.value, 'raw');
    else if (mode === 'file') setPayload(file!, mode);
    else console.warn('Cannot confirm payload');
  };

  return (
    <StepCard title={'add your secret'}>
      <SegmentedControl
        value={mode}
        onChange={(newMode) => setMode(newMode as PayloadInputMode)}
        data={[
          {
            label: 'Text',
            value: 'text',
          },
          {
            label: 'JSON',
            value: 'json',
          },
          {
            label: 'File',
            value: 'file',
          },
        ]}
        style={{
          marginTop: theme.spacing.sm,
          marginBottom: theme.spacing.sm,
        }}
      />
      {mode === 'text' ? (
        <PasswordInput
          ref={textRef}
          size={'md'}
          placeholder={'Your secret'}
          onChange={(event) =>
            validateOnChange('text', event.target.value)
          }
        />
      ) : mode === 'json' ? (
        <JsonInput
          ref={jsonRef}
          label={'Secret Configuration'}
          placeholder={'Your secret config here...'}
          validationError={'Invalid JSON'}
          onChange={(value) => validateOnChange('json', value)}
          formatOnBlur
          autosize
          minRows={4}
        />
      ) : mode === 'file' ? (
        <Box
          display={'flex'}
          style={{
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
          }}
        >
          <Box
            display={'flex'}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <FileButton
              onChange={(file) => validateOnChange('file', file)}
              accept={ACCEPTED_FILE_TYPES.join(',')}
            >
              {(props) => (
                <Button disabled={!!file} {...props}>
                  Upload Secrets File
                </Button>
              )}
            </FileButton>
            {file && (
              <Text
                weight={'bold'}
                style={{ marginLeft: theme.spacing.sm }}
              >
                {file.name}
              </Text>
            )}
          </Box>
          <Text size={'sm'}>
            Allows extensions: {ACCEPTED_FILE_TYPES.join(', ')}
          </Text>
        </Box>
      ) : (
        <Text>Invalid Payload Mode</Text>
      )}
      <Box style={{ marginTop: theme.spacing.lg }}>
        <Captcha
          onSuccess={() => setCanConfirm(true)}
          onExpire={() => setCanConfirm(false)}
        />
      </Box>
      <Button
        id={CONFIRM_PAYLOAD_BTN_ID}
        onClick={confirmPayload}
        disabled={!canConfirm || !isValid}
        style={{ marginTop: theme.spacing.md }}
      >
        Confirm Payload
      </Button>
    </StepCard>
  );
};
