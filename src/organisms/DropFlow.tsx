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
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { DropProvider, useDropContext } from 'contexts/DropContext';
import DropLog from 'molecules/DropLog';
import StepCard from 'molecules/steps/StepCard';
import { SharePane } from 'molecules/SharePane';
import { SecretInputCard } from 'molecules/steps/SecretInputCard';

const STEP_COUNT = 3;

const DropFlow = () => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);

    const inputRef = useRef<HTMLInputElement>();

    const { status, init, dropLink, drop, getLogs } = useDropContext();

    const currentStep = useMemo(() => {
        if (status === DropState.Initial) return 0;
        else if (status === DropState.Ready) return 1;
        else if ([DropState.Waiting, DropState.AwaitingHandshake].includes(status))
            return 2;
        else if (status === DropState.Acknowledged) return 3;
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
                    <SecretInputCard />
                </Stepper.Step>
                <Stepper.Step
                    label={'Share link'}
                    description={isMobile && 'Share your secrets'}
                >
                    <StepCard title={'share'}>
                        {dropLink() && <SharePane link={dropLink()!} />}
                    </StepCard>
                </Stepper.Step>
                <Stepper.Step
                    label={'Confirm drop'}
                    description={isMobile && 'Drop your message'}
                >
                    <StepCard title={'finish your deaddrop'}>
                        <Button onClick={drop}>Drop</Button>
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
