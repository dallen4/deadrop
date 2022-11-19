import React, { useMemo, useRef } from 'react';
import { DropState } from '@lib/constants';
import {
    Box,
    Button,
    Text,
    Stepper,
    useMantineTheme,
    PasswordInput,
    Title,
    Card,
    CopyButton,
} from '@mantine/core';
import { useClipboard, useMediaQuery } from '@mantine/hooks';
import { Copy } from 'react-feather';
import { DropProvider, useDropContext } from 'contexts/DropContext';
import DropLog from 'molecules/DropLog';
import StepCard from 'molecules/steps/StepCard';
import { QRCode } from 'atoms/QRCode';
import { SharePane } from 'molecules/SharePane';

const STEP_COUNT = 3;

const DropFlow = () => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);

    const inputRef = useRef<HTMLInputElement>();

    const { status, init, setPayload, dropLink, getLogs } = useDropContext();

    const currentStep = useMemo(() => {
        if (status === DropState.Initial) return 0;
        else if (status === DropState.Ready) return 1;
        else if (status === DropState.Waiting) return 2;
        else return 0;
    }, [status]);

    return (
        <Box>
            <Stepper
                active={currentStep}
                orientation={isMobile ? 'vertical' : 'horizontal'}
            >
                <Stepper.Step
                    label={'Start session'}
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
                        {dropLink() && <SharePane link={dropLink()!} />}
                    </StepCard>
                </Stepper.Step>
                <Stepper.Completed>
                    <Card style={{ margin: theme.spacing.md }}>
                        <Title size={'h1'}>All done!</Title>
                    </Card>
                </Stepper.Completed>
            </Stepper>
            <DropLog logs={getLogs()} />
        </Box>
    );
};

export default () => {
    return (
        <DropProvider>
            <DropFlow />
        </DropProvider>
    );
};
