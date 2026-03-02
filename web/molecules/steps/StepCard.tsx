import React from 'react';
import { Card, Title, useMantineTheme } from '@mantine/core';

const StepCard = ({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) => {
    const theme = useMantineTheme();

    return (
        <Card style={{ margin: theme.spacing.md }}>
            <Title size={'h3'}>{title}</Title>
            {children}
        </Card>
    );
};

export default StepCard;
