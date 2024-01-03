import React from 'react';
import { Code, useMantineTheme } from '@mantine/core';

export const BlockCode = ({ data }: { data: string }) => {
    const theme = useMantineTheme();

    return (
        <Code block style={{ padding: theme.spacing.sm }}>
            {data}
        </Code>
    );
};

export const InlineCode = ({ children }: { children: React.ReactNode }) => {
    const theme = useMantineTheme();

    return (
        <Code block={false} style={{ padding: theme.spacing.xs * 0.6 }}>
            {children}
        </Code>
    );
};
