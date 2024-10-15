import {
    Badge,
    Text,
    Card,
    SimpleGrid,
    Container,
    useMantineTheme,
    createStyles,
} from '@mantine/core';
import { IconBrowser, IconTerminal2, IconBrandVscode } from '@tabler/icons';
import { SectionTitle } from './SectionTitle';

// ref: https://ui.mantine.dev/category/features/#features-cards

const useStyles = createStyles((theme) => ({
    title: {
        fontSize: '34px',
        fontWeight: 900,

        '@media (max-width: 520px)': {
            fontSize: '24px',
        },
    },

    description: {
        maxWidth: '600px',
        margin: 'auto',

        '&::after': {
            content: '""',
            display: 'block',
            backgroundColor: theme.colors.blue[7],
            width: '45px',
            height: '2px',
            marginTop: theme.spacing.sm,
            marginLeft: 'auto',
            marginRight: 'auto',
        },
    },

    card: {
        border: `1px solid light-dark(${theme.colors.gray[1]}, ${theme.colors.gray[5]})`,
    },

    cardTitle: {
        '&::after': {
            content: '""',
            display: 'block',
            backgroundColor: theme.colors.blue[7],
            width: '45px',
            height: '2px',
            marginTop: theme.spacing.sm,
        },
    },
}));

const toolData = [
    {
        title: 'Web Application',
        status: 'stable',
        description: `Use the deadrop web application and even save it to your device's home screen as a PWA!`,
        icon: IconBrowser,
    },
    {
        title: 'CLI',
        status: 'stable',
        description: `Use NPM's npx to use deadrop directly in your terminal!`,
        icon: IconTerminal2,
    },
    {
        title: 'VS Code',
        status: 'in development',
        description: `Start a session in the sidebar or right-click a file to use deadrop right in your editor!`,
        icon: IconBrandVscode,
    },
];

const statusToColor = {
    stable: 'blue',
    experimental: 'indigo',
    'in development': 'yellow',
};

export function Tools() {
    const theme = useMantineTheme();
    const { classes } = useStyles();

    const features = toolData.map((feature) => (
        <Card
            key={feature.title}
            shadow={'md'}
            radius={'md'}
            className={classes.card}
            p={'xl'}
        >
            <Container
                p={0}
                display={'flex'}
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                }}
            >
                <feature.icon
                    style={{ width: 50, height: 50 }}
                    stroke={2}
                    color={theme.colors.blue[6]}
                />
                <Badge
                    size={'lg'}
                    color={
                        statusToColor[
                            feature.status as keyof typeof statusToColor
                        ]
                    }
                >
                    {feature.status}
                </Badge>
            </Container>

            <Text
                size={'lg'}
                fz="lg"
                fw={700}
                className={classes.cardTitle}
                mt="md"
            >
                {feature.title}
            </Text>

            <Text fz="sm" c="dimmed" mt="sm">
                {feature.description}
            </Text>
        </Card>
    ));

    return (
        <Container size="lg" py="xl" px={0} mb={theme.spacing.xl * 2}>
            <SectionTitle label={'Tools'} id={'tools-section'} />

            <SimpleGrid
                cols={3}
                breakpoints={[{ maxWidth: 'sm', cols: 1 }]}
                spacing="xl"
            >
                {features}
            </SimpleGrid>
        </Container>
    );
}
