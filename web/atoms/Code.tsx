import React from 'react';
import { Code, MantineSize, useMantineTheme } from '@mantine/core';

export const BlockCode = ({ data }: { data: string }) => {
  const theme = useMantineTheme();

  return (
    <Code block style={{ padding: theme.spacing.sm }}>
      {data}
    </Code>
  );
};

export const InlineCode = ({
  children,
  size,
}: {
  children: React.ReactNode;
  size?: MantineSize;
}) => {
  const theme = useMantineTheme();

  return (
    <Code
      block={false}
      style={{
        fontSize: size && theme.fontSizes[size],
        padding: theme.spacing.xs * 0.6,
      }}
    >
      {children}
    </Code>
  );
};
