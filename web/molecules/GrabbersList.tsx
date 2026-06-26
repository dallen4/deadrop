import React from 'react';
import { Badge, Group, Stack, Text } from '@mantine/core';
import { GrabberStatus } from '@shared/types/drop';
import type { GrabberRecord } from '@shared/types/drop';

const STATUS_LABEL: Record<GrabberStatus, string> = {
    [GrabberStatus.Connected]: 'Connected',
    [GrabberStatus.Transferring]: 'Transferring',
    [GrabberStatus.Confirmed]: 'Confirmed',
    [GrabberStatus.Failed]: 'Failed',
};

const STATUS_COLOR: Record<GrabberStatus, string> = {
    [GrabberStatus.Connected]: 'blue',
    [GrabberStatus.Transferring]: 'yellow',
    [GrabberStatus.Confirmed]: 'green',
    [GrabberStatus.Failed]: 'red',
};

export const GrabbersList = ({
    grabbers,
}: {
    grabbers: GrabberRecord[];
}) => {
    if (grabbers.length === 0) {
        return (
            <Text size={'sm'} c={'dimmed'}>
                Waiting for a grabber to connect...
            </Text>
        );
    }

    return (
        <Stack gap={'xs'} data-testid={'grabbers-list'}>
            {grabbers.map((grabber) => (
                <Group
                    key={grabber.peerId}
                    justify={'space-between'}
                    wrap={'nowrap'}
                >
                    <Text size={'sm'} truncate>
                        {grabber.peerId}
                    </Text>
                    <Badge color={STATUS_COLOR[grabber.status]}>
                        {STATUS_LABEL[grabber.status]}
                    </Badge>
                </Group>
            ))}
        </Stack>
    );
};
