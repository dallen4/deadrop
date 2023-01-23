import React, { useRef } from 'react';
import { HeroBanner } from 'molecules/HeroBanner';
import { FeaturesSection } from 'molecules/FeaturesSection';
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
import { useRouter } from 'next/router';
import { GRAB_PATH } from '@config/paths';
import { Faq } from 'molecules/Faq';

const Home = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const inputRef = useRef<HTMLInputElement>();
    return (
        <>
            <HeroBanner />
            <FeaturesSection />
            <Center
                style={{ minHeight: '220px', paddingTop: theme.spacing.md }}
            >
                <Card
                    id={'start-grab-section'}
                    withBorder
                    shadow={'sm'}
                    style={{
                        width: '90%',
                        maxWidth: '650px',
                        padding: theme.spacing.xl,
                    }}
                >
                    <Title size={'h2'}>Grab a Secret</Title>
                    <Text size={'sm'}>
                        Enter your drop ID (or link) that was shared with you!
                    </Text>
                    <Group position={'left'}>
                        <TextInput
                            ref={inputRef as any}
                            width={'100%'}
                            variant={'filled'}
                            placeholder={'abcdef12345'}
                        />
                        <Button
                            onClick={() => {
                                const params = new URLSearchParams({
                                    drop: inputRef.current!.value,
                                });
                                router.push(`${GRAB_PATH}?${params}`);
                            }}
                        >
                            Start
                        </Button>
                    </Group>
                </Card>
            </Center>
            <Faq/>
        </>
    );
};

export default Home;
