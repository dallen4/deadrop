import React, { useEffect, useState } from 'react';
import {
    AppShell,
    useMantineTheme,
    Header,
    Title,
    Footer,
    Text,
    Stepper,
    Group,
    Button,
    Card,
    Image,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useDeadDrop } from 'hooks/use-deaddrop';

const STEP_COUNT = 3;

const Home = (props: any) => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);

    const [active, setActive] = useState(0);
    const [link, setLink] = useState('');

    const { init } = useDeadDrop();

    const nextStep = () =>
        setActive((current) => (current < STEP_COUNT ? ++current : current));
    const prevStep = () => setActive((current) => (current > 0 ? --current : current));

    const test = async () => {
    };

    useEffect(() => {
        test().catch(console.error);
        init();
    }, []);

    return (
        <AppShell
            padding={'md'}
            styles={{
                body: {
                    justifyContent: 'center',
                },
                main: {
                    maxWidth: '700px',
                },
            }}
            header={
                <Header
                    height={90}
                    withBorder={false}
                    styles={(theme) => ({
                        root: {
                            padding: theme.spacing.md,
                            textAlign: 'center',
                        },
                    })}
                >
                    <Title>deadDrop</Title>
                </Header>
            }
            footer={
                <Footer
                    height={60}
                    withBorder={false}
                    styles={(theme) => ({
                        root: {
                            padding: theme.spacing.md,
                            textAlign: 'center',
                        },
                    })}
                >
                    <Text size={'xs'}>
                        Copyright &copy; Nieky Allen {new Date().getFullYear()}.
                    </Text>
                </Footer>
            }
        >
            <Stepper active={active} orientation={'horizontal'}>
                <Stepper.Step
                    label={'Start Session'}
                    description={isMobile && 'Get started with a new drop'}
                >
                    <Card style={{ margin: theme.spacing.md }}>
                        <Title size={'h4'}>starting a session</Title>
                    </Card>
                </Stepper.Step>
                <Stepper.Step
                    label={'Input secrets'}
                    description={isMobile && 'Add your secrets'}
                >
                    <Card style={{ margin: theme.spacing.md }}>
                        <Title size={'h4'}>waiting for secrets</Title>
                    </Card>
                </Stepper.Step>
                <Stepper.Step
                    label={'Share link'}
                    description={isMobile && 'Share your secrets'}
                >
                    <Card style={{ margin: theme.spacing.md }}>
                        <Title size={'h4'}>send drop location</Title>
                    </Card>
                </Stepper.Step>
                <Stepper.Completed>
                    <Card style={{ margin: theme.spacing.md }}>
                        <Title size={'h1'}>All done!</Title>
                        <Image radius={'sm'} src={link} width={200} height={200}/>
                    </Card>
                </Stepper.Completed>
            </Stepper>
            <Group position={'right'} style={{ marginRight: theme.spacing.md }}>
                <Button onClick={prevStep}>Prev</Button>
                <Button onClick={nextStep}>Next</Button>
            </Group>
        </AppShell>
    );
};

export default Home;
