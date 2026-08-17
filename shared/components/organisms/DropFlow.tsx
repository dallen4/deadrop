import { useMemo, useState } from 'react';
import { DropState } from '../../lib/constants';
import { GrabberStatus } from '../../types/drop';
import {
  Box,
  Button,
  NumberInput,
  Text,
  Stepper,
  useMantineTheme,
  Title,
  Card,
  Stack,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import DropLog from '../molecules/DropLog';
import StepCard from '../molecules/StepCard';
import { SharePane } from '../molecules/SharePane';
import { GrabbersList } from '../molecules/GrabbersList';
import {
  SecretInputCard,
  SecretInputCardProps,
} from '../molecules/SecretInputCard';
import { BEGIN_DROP_BTN_ID } from '../../lib/dom-ids';
import type { UseDropReturn } from '../../hooks/use-drop';

export type DropFlowProps = {
  // Controller from the shared useDrop hook (platform supplies its deps).
  drop: UseDropReturn<File>;
  // Whether the experimental multidrop controls are shown. Injected by the
  // platform (web: Clerk claims / test-flag cookie; desktop: plan claims).
  experimental?: boolean;
  // Builds the public grab URL for a drop id (platform origin).
  generateGrabUrl: (id: string) => string;
  // Optional captcha slot forwarded to SecretInputCard.
  renderCaptcha?: SecretInputCardProps['renderCaptcha'];
  // Payload composed elsewhere; the input step summarises it instead.
  staged?: { summary: string; payload: string };
};

export const DropFlow = ({
  drop,
  experimental = false,
  generateGrabUrl,
  renderCaptcha,
  staged,
}: DropFlowProps) => {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${theme.breakpoints.sm}px)`,
  );

  const [cap, setCap] = useState<number | ''>(1);

  const {
    status,
    init,
    getDropId,
    stopAccepting,
    setMaxGrabbers,
    getLogs,
    grabbers,
    accepting,
    maxGrabbers,
  } = drop;

  const dropId = getDropId();
  const dropLink = dropId ? generateGrabUrl(dropId) : undefined;

  const onCapChange = (value: number | string) => {
    const next = value === '' ? '' : Number(value);

    setCap(next);
    setMaxGrabbers(next === '' ? null : next);
  };

  const currentStep = useMemo(() => {
    switch (status) {
      case DropState.Initial:
        return 0;
      case DropState.Ready:
        // TODO start 5 min timer
        return 1;
      case DropState.Accepting:
        return 2;
      case DropState.Completed:
        return 3;
      default:
        return 0;
    }
  }, [status]);

  const grabberList = useMemo(
    () => Array.from(grabbers?.values() ?? []),
    [grabbers],
  );

  const confirmedCount = useMemo(
    () =>
      grabberList.filter(
        (grabber) => grabber.status === GrabberStatus.Confirmed,
      ).length,
    [grabberList],
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
            <Stack gap={'md'} align={'flex-start'}>
              <Text c={'dimmed'}>ready to start a drop?</Text>
              {experimental && (
                <NumberInput
                  label={'Max grabbers'}
                  description={'How many people can grab this drop'}
                  min={1}
                  value={cap}
                  onChange={onCapChange}
                  w={140}
                />
              )}
              <Button id={BEGIN_DROP_BTN_ID} onClick={init}>
                Begin
              </Button>
            </Stack>
          </StepCard>
        </Stepper.Step>
        <Stepper.Step
          label={'Input'}
          description={isMobile && 'Add your secrets'}
        >
          {staged ? (
            <StepCard title={'input'}>
              <Stack gap={'sm'}>
                <Text>{staged.summary}</Text>
                <Button
                  onClick={() =>
                    drop.setPayload(staged.payload, 'raw')
                  }
                >
                  Continue
                </Button>
              </Stack>
            </StepCard>
          ) : (
            <SecretInputCard
              setPayload={drop.setPayload}
              renderCaptcha={renderCaptcha}
            />
          )}
        </Stepper.Step>
        <Stepper.Step
          label={'Share'}
          description={isMobile && 'Share with your grabbers'}
        >
          <StepCard title={'share'}>
            {dropLink && (
              <SharePane
                link={dropLink}
                accepting={
                  status === DropState.Accepting && accepting
                }
                confirmedCount={confirmedCount}
                maxGrabbers={maxGrabbers}
                experimental={experimental}
              />
            )}
            {status === DropState.Accepting && (
              <Box style={{ marginTop: theme.spacing.md }}>
                <Text fw={'bold'}>
                  Grabbers ({confirmedCount} confirmed)
                </Text>
                <GrabbersList grabbers={grabberList} />
                {accepting && (
                  <Button
                    color={'red'}
                    variant={'outline'}
                    onClick={stopAccepting}
                    style={{ marginTop: theme.spacing.sm }}
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
