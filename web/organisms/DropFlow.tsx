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
import { useDropContext } from 'contexts/DropContext';
import DropLog from 'molecules/DropLog';
import StepCard from 'molecules/steps/StepCard';
import { SharePane } from 'molecules/SharePane';
import { SecretInputCard } from 'molecules/steps/SecretInputCard';
import { BEGIN_DROP_BTN_ID, DROP_SECRET_BTN_ID } from 'lib/constants';

export const DropFlow = () => {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${theme.breakpoints.sm}px)`,
  );

  const {
    status,
    init,
    dropLink,
    startSession,
    stopAccepting,
    getLogs,
    grabbers,
    accepting,
  } = useDropContext();

  const currentStep = useMemo(() => {
    switch (status) {
      case DropState.Initial:
        return 0;
      case DropState.Ready:
        // TODO start 5 min timer
        return 1;
      case DropState.Accepting:
        return 3;
      case DropState.Completed:
        return 4;
      default:
        return 0;
    }
  }, [status]);

  const grabberList = useMemo(
    () => Array.from(grabbers?.values() ?? []),
    [grabbers],
  );

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
            <Button id={DROP_SECRET_BTN_ID} onClick={startSession}>
              Drop
            </Button>
            {status === DropState.Accepting && (
              <Box style={{ marginTop: theme.spacing.md }}>
                <Text fw={'bold'}>Grabbers</Text>
                {grabberList.length === 0 && (
                  <Text size={'sm'}>
                    Waiting for a grabber to connect...
                  </Text>
                )}
                <ul>
                  {grabberList.map((grabber) => (
                    <li key={grabber.peerId}>
                      {grabber.peerId} - {grabber.status}
                    </li>
                  ))}
                </ul>
                {accepting && (
                  <Button
                    color={'red'}
                    variant={'outline'}
                    onClick={stopAccepting}
                  >
                    Stop accepting grabbers
                  </Button>
                )}
              </Box>
            )}
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
