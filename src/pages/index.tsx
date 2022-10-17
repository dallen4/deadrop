import React, { useMemo, useRef, useState } from 'react';
import {
    useMantineTheme,
    Title,
    Text,
    Stepper,
    Group,
    Button,
    Card,
    Image,
    PasswordInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useDrop } from 'hooks/use-drop';
import StepCard from 'molecules/steps/StepCard';
import { DropState } from '@lib/constants';
import DropLog from 'molecules/DropLog';

const STEP_COUNT = 3;

const Home = (props: any) => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);

    const inputRef = useRef<HTMLInputElement>();

    const { status, init, setPayload, getDropLink, getLogs } = useDrop();

    const currentStep = useMemo(() => {
        if (status === DropState.Initial) return 0;
        else if (status === DropState.Ready) return 1;
        else if (status === DropState.Waiting) return 2;
        else return 0;
    }, [status]);

    console.log('STATUS: ', status);

    return (
        <>
            <Stepper active={currentStep} orientation={'horizontal'}>
                <Stepper.Step
                    label={'Start Session'}
                    description={isMobile && 'Get started with a new drop'}
                >
                    <StepCard title={'starting a session'}>
                        <Text>ready to start a drop?</Text>
                        <Button onClick={init}>Start</Button>
                    </StepCard>
                </Stepper.Step>
                <Stepper.Step
                    label={'Input secrets'}
                    description={isMobile && 'Add your secrets'}
                >
                    <StepCard title={'waiting for secrets'}>
                        <PasswordInput
                            ref={inputRef as any}
                            size={'md'}
                            placeholder={'Your secret'}
                        />
                        <Button onClick={() => setPayload(inputRef.current!.value)}>
                            Wrap Message
                        </Button>
                    </StepCard>
                </Stepper.Step>
                <Stepper.Step
                    label={'Share link'}
                    description={isMobile && 'Share your secrets'}
                >
                    <StepCard title={'share'}>
                        <Title size={'h1'}>send drop link to friend</Title>
                        <Image radius={'sm'} src={getDropLink()} width={200} height={200} />
                    </StepCard>
                </Stepper.Step>
                <Stepper.Completed>
                    <Card style={{ margin: theme.spacing.md }}>
                        <Title size={'h1'}>All done!</Title>
                    </Card>
                </Stepper.Completed>
            </Stepper>
            <DropLog logs={getLogs()} />
        </>
    );
};

export default Home;
