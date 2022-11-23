import React from 'react';
import { Box, Button, Text, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { GrabProvider, useGrabContext } from 'contexts/GrabContext';
import DropLog from 'molecules/DropLog';

const GrabFlow = () => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);

    const { init, status, getLogs } = useGrabContext();

    return (
        <Box>
            <Text>You are about to begin a deaddrop.</Text>
            <Button onClick={init}>Begin</Button>
            <Text>Status: {status}</Text>
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
