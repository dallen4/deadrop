import React from 'react';
import {
    Title,
    Text,
    Container,
    Button,
    Anchor,
} from '@mantine/core';
import { useNavigate } from 'react-router';
import { DROP_PATH } from '@shared/config/paths';
import { TypeAnimation } from 'react-type-animation';

// based off of: https://ui.mantine.dev/category/hero

import classes from './HeroBanner.module.css';
import { useMantineTheme } from '@mantine/core';

export function HeroBanner() {
    const theme = useMantineTheme();
    const navigate = useNavigate();

    return (
        <div className={classes.wrapper}>
            <div className={classes.inner}>
                <Title className={classes.brandName}>
                    dea<span className={classes.brandNameDrop}>drop</span>
                </Title>
                <Title className={classes.title}>
                    Quickly and securely share
                    <br />
                    <TypeAnimation
                        sequence={[
                            'passwords',
                            2500,
                            'API keys',
                            2500,
                            '.env files',
                            2500,
                            'secrets',
                            2500,
                        ]}
                        wrapper={'span'}
                        className={classes.highlight}
                        speed={15}
                        repeat={Infinity}
                    />
                </Title>

                <Container size={640} p={0}>
                    <Text size={'lg'} className={classes.description}>
                        Avoid messy and unsafe methods of sharing sensitive
                        information.
                    </Text>
                </Container>

                <div>
                    <div className={classes.controls}>
                        <Button
                            className={classes.control}
                            size={'lg'}
                            onClick={() => navigate(DROP_PATH)}
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
