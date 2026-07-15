import React from 'react';
import {
  ActionIcon,
  Box,
  Code,
  CopyButton,
  MantineSize,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';

export type CopyableCodeProps = {
  value: string;
  prompt?: boolean;
  ariaLabel?: string;
};

export const CopyableCode = ({
  value,
  prompt = true,
  ariaLabel = 'Copy to clipboard',
}: CopyableCodeProps) => {
  const theme = useMantineTheme();
  const lines = value.split('\n');
  const isMultiline = lines.length > 1;

  return (
    <Box
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.md,
      }}
    >
      <Code
        block
        style={{
          flex: 1,
          fontSize: theme.fontSizes.sm,
          padding: `${theme.spacing.sm} calc(${theme.spacing.xl} + ${theme.spacing.sm}) ${theme.spacing.sm} ${theme.spacing.sm}`,
          borderLeft: `2px solid ${theme.colors.blue[9]}a8`,
        }}
      >
        {lines.map((line, i) => {
          const isCommand =
            prompt && line.trim() !== '' && !line.trimStart().startsWith('#');

          return (
            <React.Fragment key={i}>
              {isCommand && <span style={{ opacity: 0.5 }}>$ </span>}
              {line}
              {i < lines.length - 1 && '\n'}
            </React.Fragment>
          );
        })}
      </Code>
      <CopyButton value={value} timeout={2000}>
        {({ copied, copy }) => (
          <Tooltip
            label={copied ? 'Copied' : 'Copy'}
            withArrow
            position={'right'}
          >
            <ActionIcon
              variant={'subtle'}
              color={copied ? 'teal' : 'gray'}
              onClick={copy}
              style={{
                position: 'absolute',
                right: theme.spacing.xs,
                opacity: copied ? 1 : 0.5,
                transition: 'opacity 100ms ease',
                ...(isMultiline
                  ? { top: theme.spacing.xs }
                  : { top: '50%', transform: 'translateY(-50%)' }),
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                if (!copied) e.currentTarget.style.opacity = '0.5';
              }}
              aria-label={ariaLabel}
            >
              {copied ? (
                <IconCheck size={16} />
              ) : (
                <IconCopy size={16} />
              )}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Box>
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
        fontSize: size ? theme.fontSizes[size] : '15px',
        padding: '2px 6px',
      }}
    >
      {children}
    </Code>
  );
};
