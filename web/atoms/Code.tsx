import React from 'react';
import { Code } from '@mantine/core';

export const BlockCode = ({ data }: { data: string }) => {
    return (
        <Code block style={{ padding: 'var(--mantine-spacing-sm)' }}>
            {data}
        </Code>
    );
};

export const InlineCode = ({ children }: { children: React.ReactNode }) => {
    return (
        <Code block={false} style={{ padding: 'calc(var(--mantine-spacing-xs) * 0.6)' }}>
            {children}
        </Code>
    );
};
