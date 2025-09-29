import {
    Badge,
    Text,
    Card,
    SimpleGrid,
    Container,
    useMantineTheme,
} from '@mantine/core';
import { IconBrowser, IconTerminal2, IconBrandVscode } from '@tabler/icons-react';
import { SectionTitle } from './SectionTitle';

// ref: https://ui.mantine.dev/category/features/#features-cards

import classes from './Tools.module.css';

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

    const features = toolData.map((feature) => (
        <Card
            key={feature.title}
            shadow={'md'}
            radius={'md'}
            className={classes.card}
            p={'xl'}
        >
            <div className={classes.cardHeader}>
                <feature.icon
                    className={classes.cardIcon}
                    style={{ width: 50, height: 50 }}
                    stroke={2}
                    color={theme.colors.blue[6]}
                />
                <Badge
                    className={classes.cardBadge}
                    size={'lg'}
                    color={
                        statusToColor[
                            feature.status as keyof typeof statusToColor
                        ]
                    }
                >
                    {feature.status}
                </Badge>
            </div>

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
        <Container size="lg" py="xl" px={0} mb={'calc(var(--mantine-spacing-xl) * 2)'}>
            <SectionTitle label={'Tools'} id={'tools-section'} />

            <SimpleGrid
                cols={{ base: 1, sm: 3 }}
                spacing="xl"
            >
                {features}
            </SimpleGrid>
        </Container>
    );
}
