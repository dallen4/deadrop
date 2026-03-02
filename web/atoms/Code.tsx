import React from 'react';
import { Box, Code, useMantineTheme } from '@mantine/core';

export const BlockCode = ({ data }: { data: string }) => {
  const theme = useMantineTheme();

  return (
    <Box px={'xs'} pb={'sm'}>
      <Code
        block
        style={{
          fontSize: theme.fontSizes.md,
          lineHeight: 1.8,
          borderLeft: '3px solid var(--mantine-color-blue-6)',
        }}
      >
        {data}
      </Code>
    </Box>
  );
};

export const InlineCode = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const theme = useMantineTheme();
  return (
    <Code
      block={false}
      style={{
        padding: 'calc(var(--mantine-spacing-xs) * 0.6)',
        fontSize: theme.fontSizes.md,
      }}
    >
      {children}
    </Code>
  );
};
