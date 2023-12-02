import React from 'react';
import {
    Title,
    Text,
    Container,
    Button,
    createStyles,
    Anchor,
} from '@mantine/core';
import { useRouter } from 'next/router';
import { DROP_PATH } from '@shared/config/paths';

// based off of: https://ui.mantine.dev/category/hero

const useStyles = createStyles((theme) => ({
    wrapper: {
        position: 'relative',
        paddingTop: 75,
        paddingBottom: 105,

        '@media (max-width: 520px)': {
            paddingTop: 65,
            paddingBottom: 50,
        },
    },

    inner: {
        position: 'relative',
        zIndex: 1,
    },

    brandName: {
        display: 'none',
        paddingBottom: theme.spacing.xs,
        color: theme.white,
        fontSize: (theme.headings.sizes.h1.fontSize! as number) * 1.4,

        '@media (max-width: 504px)': {
            display: 'block',
        },
    },

    brandNameDrop: {
        color: theme.colors.blue['4'],
    },

    title: {
        fontWeight: 800,
        fontSize: 40,
        letterSpacing: -1,
        color: theme.white,
        marginBottom: theme.spacing.xs,
        textAlign: 'center',

        '@media (max-width: 520px)': {
            fontSize: 28,
            textAlign: 'left',
        },
    },

    highlight: {
        color: theme.colors[theme.primaryColor][4],
    },

    description: {
        color: theme.colors.gray[0],
        textAlign: 'center',

        '@media (max-width: 520px)': {
            fontSize: theme.fontSizes.md,
            textAlign: 'left',
        },
    },

    controls: {
        marginTop: theme.spacing.xl * 1.5,
        display: 'flex',
        justifyContent: 'center',

        '@media (max-width: 520px)': {
            flexDirection: 'column',
        },
    },

    control: {
        height: 42,
        fontSize: theme.fontSizes.md,

        '&:not(:first-child)': {
            marginLeft: theme.spacing.md,
        },

        '@media (max-width: 520px)': {
            '&:not(:first-child)': {
                marginTop: theme.spacing.md,
                marginLeft: 0,
            },
        },
    },
}));

export function HeroBanner() {
    const { classes, theme } = useStyles();
    const router = useRouter();

    return (
        <div className={classes.wrapper}>
            <div className={classes.inner}>
                <Title className={classes.brandName}>
                    dea<span className={classes.brandNameDrop}>drop</span>
                </Title>
                <Title className={classes.title}>
                    Quickly and securely share{' '}
                    <Text
                        component="span"
                        inherit
                        className={classes.highlight}
                    >
                        secrets
                    </Text>
                </Title>

                <Container size={640} p={0}>
                    <Text size={'lg'} className={classes.description}>
                        Avoid messy and unsafe methods of sharing configuration
                        files, keys, and credentials.
                    </Text>
                </Container>

                <div>
                    <div className={classes.controls}>
                        <Button
                            className={classes.control}
                            size={'lg'}
                            onClick={() => router.push(DROP_PATH)}
                        >
                            Start a Drop
                        </Button>
                        <Button
                            className={classes.control}
                            variant={'light'}
                            size={'lg'}
                            component={'a'}
                            href={'#faq-section'}
                        >
                            Learn More
                        </Button>
                    </div>
                    <Text
                        size={'sm'}
                        style={{
                            paddingTop: theme.spacing.sm,
                            textAlign: 'center',
                        }}
                    >
                        Or{' '}
                        <Anchor inherit inline href={'#start-grab-section'}>
                            grab a secret
                        </Anchor>
                    </Text>
                </div>
            </div>
        </div>
    );
}
