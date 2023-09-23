import React from 'react';
import { createStyles, Text, SimpleGrid, Container } from '@mantine/core';
import { IconLock, IconKey, TablerIcon, IconUsers } from '@tabler/icons';

// based off of: https://ui.mantine.dev/category/features

const useStyles = createStyles((theme) => ({
    feature: {
        position: 'relative',
        paddingTop: theme.spacing.xl,
        paddingLeft: theme.spacing.xl,
    },

    overlay: {
        position: 'absolute',
        height: 100,
        width: 160,
        top: 0,
        left: 0,
        backgroundColor: theme.fn.variant({
            variant: 'light',
            color: theme.primaryColor,
        }).background,
        zIndex: 1,
    },

    content: {
        position: 'relative',
        zIndex: 2,
    },

    icon: {
        color: theme.fn.variant({ variant: 'light', color: theme.primaryColor })
            .color,
    },

    title: {
        color: theme.colorScheme === 'dark' ? theme.white : theme.black,
    },
}));

interface FeatureProps extends React.ComponentPropsWithoutRef<'div'> {
    icon: TablerIcon;
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
    const { classes, cx } = useStyles();

    return (
        <div className={cx(classes.feature, className)} {...others}>
            <div className={classes.overlay} />

            <div className={classes.content}>
                <Icon size={38} className={classes.icon} />
                <Text
                    weight={700}
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
                cols={3}
                breakpoints={[{ maxWidth: 'sm', cols: 1 }]}
                spacing={50}
            >
                {items}
            </SimpleGrid>
        </Container>
    );
}
