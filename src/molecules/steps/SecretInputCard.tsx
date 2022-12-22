import React, { useRef, useState } from 'react';
import {
    Text,
    PasswordInput,
    Button,
    FileButton,
    JsonInput,
    SegmentedControl,
    Group,
} from '@mantine/core';
import StepCard from './StepCard';
import { useDropContext } from 'contexts/DropContext';
import type { PayloadInputMode } from 'types/common';
import { Captcha } from 'atoms/Captcha';
import { ACCEPTED_FILE_TYPES, MAX_PAYLOAD_SIZE } from '@config/files';

export const SecretInputCard = () => {
    const [mode, setMode] = useState<PayloadInputMode>('text');
    const [file, setFile] = useState<File | null>(null);
    const [canConfirm, setCanConfirm] = useState(process.env.NODE_ENV === 'development');

    const textRef = useRef<HTMLInputElement>(null);
    const jsonRef = useRef<HTMLTextAreaElement>(null);

    const { setPayload } = useDropContext();

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
        <StepCard title={'waiting for secrets'}>
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
            />
            {mode === 'text' ? (
                <PasswordInput ref={textRef} size={'md'} placeholder={'Your secret'} />
            ) : mode === 'json' ? (
                <JsonInput
                    ref={jsonRef}
                    label={'Secret Configuration'}
                    placeholder={'Your secret config here...'}
                    validationError={'Invalid JSON'}
                    formatOnBlur
                    autosize
                    minRows={4}
                />
            ) : mode === 'file' ? (
                <Group position={'center'}>
                    <FileButton onChange={setFile} accept={ACCEPTED_FILE_TYPES.join(',')}>
                        {(props) => <Button {...props}>Upload Secrets File</Button>}
                    </FileButton>
                    <Text size={'sm'}>
                        Allows extensions: {ACCEPTED_FILE_TYPES.join(', ')}
                    </Text>
                </Group>
            ) : (
                <Text>Invalid Payload Mode</Text>
            )}
            <Captcha
                onSuccess={() => setCanConfirm(true)}
                onExpire={() => setCanConfirm(false)}
            />
            <Button onClick={confirmPayload} disabled={!canConfirm}>
                Confirm Payload
            </Button>
        </StepCard>
    );
};
