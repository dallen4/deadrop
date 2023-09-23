import React from 'react';
import { Button, Title, useMantineTheme, Text, Center } from '@mantine/core';

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_LIFETIME_LICENSE_LINK!;

export function Premium() {
    const theme = useMantineTheme();

    return (
        <Center
            style={{
                minHeight: '200px',
                paddingTop: theme.spacing.xl,
                paddingBottom: theme.spacing.md,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-evenly',
                alignItems: 'center',
            }}
        >
            <Title size={'h4'}>
                Get unlimited daily drops and upcoming features by support
                deadrop!
            </Title>
            <Center
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Button
                    onClick={() => (window.location.href = paymentLink)}
                    type={'button'}
                >
                    Get Premium
                </Button>
                <Text size={'xs'}>
                    All licenses are attached to your email.
                </Text>
            </Center>
        </Center>
    );
}
