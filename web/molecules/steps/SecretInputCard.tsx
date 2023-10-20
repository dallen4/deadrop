import React, { useEffect, useRef, useState } from 'react';
import {
    Text,
    PasswordInput,
    Button,
    FileButton,
    JsonInput,
    SegmentedControl,
    Group,
    useMantineTheme,
    Box,
} from '@mantine/core';
import StepCard from './StepCard';
import { useDropContext } from 'contexts/DropContext';
import type { PayloadInputMode } from '@shared/types/common';
import { Captcha } from 'atoms/Captcha';
import { ACCEPTED_FILE_TYPES, MAX_PAYLOAD_SIZE } from '@shared/config/files';
import { CONFIRM_PAYLOAD_BTN_ID } from 'lib/constants';
import { useUser } from '@auth0/nextjs-auth0/client';
import Cookies from 'js-cookie';
import { DISABLE_CAPTCHA_COOKIE } from 'config/cookies';

export const SecretInputCard = () => {
    const [mode, setMode] = useState<PayloadInputMode>('text');
    const [isValid, setIsValid] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [canConfirm, setCanConfirm] = useState(
        process.env.NODE_ENV === 'development',
    );
    const { user } = useUser();

    const textRef = useRef<HTMLInputElement>(null);
    const jsonRef = useRef<HTMLTextAreaElement>(null);

    const theme = useMantineTheme();

    const { setPayload } = useDropContext();

    useEffect(() => {
        if (user) setCanConfirm(true);
        else setCanConfirm(false);
    }, [user]);

    useEffect(() => {
        const disableCaptcha = Cookies.get(DISABLE_CAPTCHA_COOKIE);

        if (disableCaptcha) {
            setCanConfirm(true);
            setIsValid(true);
        }
    }, []);

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
        if (inputMode === 'file') setIsValid(!!value);
        else if (inputMode === 'json') setIsValid(isValidJson(value as string));
        else setIsValid((value as string).length > 0);
    };

    const confirmPayload = async () => {
        if (mode === 'text') setPayload(textRef.current!.value);
        else if (mode === 'json') setPayload(jsonRef.current!.value);
        else if (mode === 'file') {
            if (file!.size > MAX_PAYLOAD_SIZE) {
                setFile(null);
                alert('This file is too big');
                return;
            }

            setPayload(file!);
        } else console.warn('Cannot confirm payload');
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
                style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm }}
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
                <Group position={'center'}>
                    <FileButton
                        onChange={(file) => validateOnChange('file', file)}
                        accept={ACCEPTED_FILE_TYPES.join(',')}
                    >
                        {(props) => (
                            <Button {...props}>Upload Secrets File</Button>
                        )}
                    </FileButton>
                    <Text size={'sm'}>
                        Allows extensions: {ACCEPTED_FILE_TYPES.join(', ')}
                    </Text>
                </Group>
            ) : (
                <Text>Invalid Payload Mode</Text>
            )}
            {!user && (
                <Box style={{ marginTop: theme.spacing.lg }}>
                    <Captcha
                        onSuccess={() => setCanConfirm(true)}
                        onExpire={() => setCanConfirm(false)}
                    />
                </Box>
            )}
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
