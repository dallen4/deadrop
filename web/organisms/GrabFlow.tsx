import React, { useEffect, useState } from 'react';
import { Box, Button, Card, Code, Loader, Text } from '@mantine/core';
import { GrabProvider, useGrabContext } from 'contexts/GrabContext';
import DropLog from 'molecules/DropLog';
import { GrabState } from '@shared/lib/constants';
import { DROP_SECRET_VALUE_ID } from 'lib/constants';
import { downloadFile } from 'lib/files';

const GrabFlow = () => {
    const { init, status, getLogs, getMode, getSecret } = useGrabContext();
    const [secretFile, setSecretFile] = useState<File | null>(null);

    useEffect(() => {
        if (getMode() === 'file' && getSecret())
            setSecretFile(getSecret() as File);
    }, [getSecret()]);

    const downloadSecret = () => {
        downloadFile(secretFile!);
    };
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
                    <Button id={'begin-grab-btn'} onClick={init}>
                        Begin
                    </Button>
                </>
            ) : status === GrabState.Confirmed ? (
                <Box>
                    {getMode() === 'raw' ? (
                        <Code block id={DROP_SECRET_VALUE_ID}>
                            {getSecret() as string}
                        </Code>
                    ) : (
                        <>
                            <Text>
                                File received: {(getSecret() as File).name}
                            </Text>
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

export default () => {
    return (
        <GrabProvider>
            <GrabFlow />
        </GrabProvider>
    );
};
