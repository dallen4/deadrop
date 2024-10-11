import React, { useMemo } from 'react';
import { DropState } from '@shared/lib/constants';
import {
    Box,
    Button,
    Text,
    Stepper,
    useMantineTheme,
    Title,
    Card,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { DropProvider, useDropContext } from 'contexts/DropContext';
import DropLog from 'molecules/DropLog';
import StepCard from 'molecules/steps/StepCard';
import { SharePane } from 'molecules/SharePane';
import { SecretInputCard } from 'molecules/steps/SecretInputCard';
import { BEGIN_DROP_BTN_ID, DROP_SECRET_BTN_ID } from 'lib/constants';

const DropFlow = () => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);

    const { status, init, dropLink, drop, getLogs } = useDropContext();

    const currentStep = useMemo(() => {
        switch (status) {
            case DropState.Initial:
                return 0;
            case DropState.Ready:
                // TODO start 5 min timer
                return 1;
            case DropState.Waiting:
            case DropState.AwaitingHandshake:
                // TODO clear timer
                return 2;
            case DropState.Acknowledged:
                return 3;
            case DropState.Completed:
                return 4;
            default:
                return 0;
        }
    }, [status]);

    return (
        <Box>
            <Stepper
                active={currentStep}
                orientation={isMobile ? 'vertical' : 'horizontal'}
            >
                <Stepper.Step
                    label={'Start'}
                    description={isMobile && 'Get started with a new drop'}
                >
                    <StepCard title={'starting a session'}>
                        <Text>ready to start a drop?</Text>
                        <Button id={BEGIN_DROP_BTN_ID} onClick={init}>
                            Begin
                        </Button>
                    </StepCard>
                </Stepper.Step>
                <Stepper.Step
                    label={'Input'}
                    description={isMobile && 'Add your secrets'}
                >
                    <SecretInputCard />
                </Stepper.Step>
                <Stepper.Step
                    label={'Share'}
                    description={isMobile && 'Share your secrets'}
                >
                    <StepCard title={'share'}>
                        {dropLink() && <SharePane link={dropLink()!} />}
                    </StepCard>
                </Stepper.Step>
                <Stepper.Step
                    label={'Drop'}
                    description={isMobile && 'Drop your message'}
                >
                    <StepCard title={'finish your deadrop'}>
                        <Button id={DROP_SECRET_BTN_ID} onClick={drop}>
                            Drop
                        </Button>
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
