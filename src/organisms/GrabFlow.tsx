import React from 'react';
import { Box, Button, Card, Code, Loader, Text, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { GrabProvider, useGrabContext } from 'contexts/GrabContext';
import DropLog from 'molecules/DropLog';
import { GrabState } from '@lib/constants';

const GrabFlow = () => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);

    const { init, status, getLogs, getSecret } = useGrabContext();

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
                    <Text>You are about to begin a deaddrop.</Text>
                    <Button onClick={init}>Begin</Button>
                </>
            ) : status === GrabState.Confirmed ? (
                <Code>
                    {JSON.stringify(getSecret())}
                </Code>
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
