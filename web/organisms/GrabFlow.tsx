import React from 'react';
import {
    Box,
    Button,
    Card,
    Code,
    Loader,
    Text,
    useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { GrabProvider, useGrabContext } from 'contexts/GrabContext';
import DropLog from 'molecules/DropLog';
import { GrabState } from '@shared/lib/constants';
import { downloadFile } from 'lib/files';

const GrabFlow = () => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);

    const { init, status, getLogs, getMode, getSecret } = useGrabContext();

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
                    <Button onClick={init}>Begin</Button>
                </>
            ) : status === GrabState.Confirmed ? (
                <Box>
                    {getMode() === 'raw' ? (
                        <Code block>
                            {getSecret()}
                        </Code>
                    ) : (
                        <>
                            <Text>
                                File received: {(getSecret() as File).name}
                            </Text>
                            <Button
                                onClick={() =>
                                    downloadFile(getSecret() as File)
                                }
                            >
                                Download
                            </Button>
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
