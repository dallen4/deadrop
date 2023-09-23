import React, { useRef } from 'react';
import { HeroBanner } from 'molecules/HeroBanner';
import {
    Title,
    Text,
    TextInput,
    Card,
    Center,
    useMantineTheme,
    Button,
    Group,
} from '@mantine/core';
import { Features, Faq } from 'molecules/sections';
import { useRouter } from 'next/router';
import { GRAB_PATH } from '@config/paths';
import { useMediaQuery } from '@mantine/hooks';

const Home = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);
    const inputRef = useRef<HTMLInputElement>();

    const submitGrab = () => {
        const inputVal = inputRef.current!.value;

        const isUrl = inputVal.includes(
            window.location.protocol + window.location.host,
        );

        const params = isUrl
            ? inputVal.split('?')[1]
            : new URLSearchParams({
                  drop: inputRef.current!.value,
              }).toString();

        router.push(`${GRAB_PATH}?${params}`);
    };

    return (
        <>
            <HeroBanner />
            <Features />
            <Center
                style={{
                    minHeight: '230px',
                    paddingTop: theme.spacing.xl,
                    paddingBottom: theme.spacing.md,
                }}
            >
                <Card
                    id={'start-grab-section'}
                    withBorder
                    shadow={'sm'}
                    style={{
                        width: '90%',
                        maxWidth: '500px',
                        padding: theme.spacing.xl,
                    }}
                >
                    <Title size={'h2'}>Grab a Secret</Title>
                    <Text size={'sm'} style={{ paddingTop: 2 }}>
                        Enter your drop ID (or link) that was shared with you!
                    </Text>
                    <Group style={{ paddingTop: theme.spacing.md }}>
                        <TextInput
                            ref={inputRef as any}
                            styles={{
                                root: isMobile
                                    ? {
                                          width: '100%',
                                      }
                                    : undefined,
                            }}
                            size={'md'}
                            variant={'filled'}
                            placeholder={'abcdef12345'}
                        />
                        <Button
                            size={'md'}
                            fullWidth={isMobile}
                            onClick={submitGrab}
                        >
                            Start
                        </Button>
                    </Group>
                </Card>
            </Center>
            <Faq />
            {/* <Premium /> */}
        </>
    );
};

export default Home;
