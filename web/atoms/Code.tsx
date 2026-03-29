import React from 'react';
import { Code, MantineSize, useMantineTheme } from '@mantine/core';

export const BlockCode = ({ data }: { data: string }) => {
  const theme = useMantineTheme();

  return (
    <Code
      block
      style={{
        padding: theme.spacing.md,
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.md,
        marginLeft: theme.spacing.xs,
        marginRight: theme.spacing.xs,
        borderLeft: `2px solid ${theme.colors.blue[9]}a8`,
      }}
    >
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
        padding: '2px 6px',
      }}
    >
      {children}
    </Code>
  );
};
