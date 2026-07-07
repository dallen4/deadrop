import React, { PropsWithChildren } from 'react';
import { Code, MantineSize, useMantineTheme } from '@mantine/core';

export const BlockCode = ({ children }: PropsWithChildren) => {
  const theme = useMantineTheme();

  return (
    <Code
      block
      style={{
        fontSize: theme.fontSizes.md,
        padding: theme.spacing.sm,
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.md,
        marginLeft: theme.spacing.xs,
        marginRight: theme.spacing.xs,
        borderLeft: `2px solid ${theme.colors.blue[9]}a8`,
      }}
    >
      {children}
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
