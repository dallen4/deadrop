import React, { useState } from 'react';
import {
    AppShell,
    useMantineTheme,
    Header,
    Title,
    Text,
    Stepper,
    Group,
    Button,
    Card,
    Image,
    Input,
    PasswordInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useDrop } from 'hooks/use-drop';
import StepCard from 'molecules/StepCard';

const STEP_COUNT = 3;

const Home = (props: any) => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);

    const [active, setActive] = useState(0);
    const [link, setLink] = useState('');

    const { status, init } = useDrop();

    const nextStep = () =>
        setActive((current) => (current < STEP_COUNT ? ++current : current));
    const prevStep = () => setActive((current) => (current > 0 ? --current : current));

    const test = async () => {};
    console.log('STATUS: ', status);
    // useEffect(() => {
    //     test().catch(console.error);
    //     init();
    // }, []);

    return (
        <>
            <Stepper active={1} orientation={'horizontal'}>
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
                        <PasswordInput size={'md'} placeholder={'Your secret'} />
                    </StepCard>
                </Stepper.Step>
                <Stepper.Step
                    label={'Share link'}
                    description={isMobile && 'Share your secrets'}
                >
                    <StepCard title={'share'}>
                        <Title size={'h1'}>send drop link to friend</Title>
                        <Image radius={'sm'} src={link} width={200} height={200} />
                    </StepCard>
                </Stepper.Step>
                <Stepper.Completed>
                    <Card style={{ margin: theme.spacing.md }}>
                        <Title size={'h1'}>All done!</Title>
                    </Card>
                </Stepper.Completed>
            </Stepper>
            <Group position={'right'} style={{ marginRight: theme.spacing.md }}>
                <Button onClick={prevStep}>Prev</Button>
                <Button onClick={nextStep}>Next</Button>
            </Group>
        </>
    );
};

export default Home;
