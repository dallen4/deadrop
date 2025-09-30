import React from 'react';
import { Text, SimpleGrid, Container } from '@mantine/core';
import clsx from 'clsx';
import { IconLock, IconKey, IconUsers, type Icon } from '@tabler/icons-react';

// based off of: https://ui.mantine.dev/category/features

import classes from './Features.module.css';

interface FeatureProps extends React.ComponentPropsWithoutRef<'div'> {
    icon: Icon;
    title: string;
    description: string;
}

function Feature({
    icon: Icon,
    title,
    description,
    className,
    ...others
}: FeatureProps) {

    return (
        <div className={clsx(classes.feature, className)} {...others}>
            <div className={classes.overlay} />

            <div className={classes.content}>
                <Icon size={38} className={classes.icon} />
                <Text
                    fw={700}
                    size={'lg'}
                    mb={'xs'}
                    mt={5}
                    className={classes.title}
                >
                    {title}
                </Text>
                <Text color={'dimmed'} size={'sm'}>
                    {description}
                </Text>
            </div>
        </div>
    );
}

const features = [
    {
        icon: IconLock,
        title: 'End-to-end encryption',
        description: `Your secrets are encrypted within your device's browser and can only decrypted when received.`,
    },
    {
        icon: IconKey,
        title: 'Ephemeral credentials',
        description:
            'None of the key pairs, nonces, or secret metadata are stored on-disk and are destroyed when drop is complete.',
    },
    {
        icon: IconUsers,
        title: 'Peer-to-peer handoff',
        description: `Secrets are never handled by a server and are sent directly to the receiving user's device via WebRTC.`,
    },
];

export function Features() {
    const items = features.map((item) => (
        <Feature {...item} key={item.title} />
    ));

    return (
        <Container mt={30} mb={30} size={'lg'}>
            <SimpleGrid
                cols={{ base: 1, sm: 3 }}
                spacing={50}
            >
                {items}
            </SimpleGrid>
        </Container>
    );
}
