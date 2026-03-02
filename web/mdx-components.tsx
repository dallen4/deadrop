import React from 'react';
import { MAX_MDX_CONTENT_WIDTH } from '@config/app';
import {
  Blockquote,
  Title,
  Text,
  List,
  Divider,
  Box,
  Center,
  useMantineTheme,
  Anchor,
} from '@mantine/core';
import { BlockCode, InlineCode } from 'atoms/Code';
import { LinkedHeading } from 'atoms/LinkedHeading';
import type { MDXComponents } from 'mdx/types';
import { Link } from 'react-router';
import { FeaturesBreakdown } from 'molecules/sections/FeaturesBreakdown';

const headingStyle = (spacing: string, includeTop = true) => ({
  ...(includeTop && { paddingTop: spacing }),
  paddingBottom: spacing,
});

const Heading = ({
  order,
  children,
  style,
}: {
  order: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  style: React.CSSProperties;
}) => (
  <Title order={order} style={style}>
    {children}
  </Title>
);

export function useMDXComponents(
  components: MDXComponents,
): MDXComponents {
  const theme = useMantineTheme();
  const spacing = theme.spacing.sm;

  const LargeText = (props: any) => (
    <Text size={theme.fontSizes.xl} lh={'28px'} {...props} />
  );

  const DynamicLink = ({
    href,
    children,
  }: React.DetailedHTMLProps<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  >) => {
    const props: any = {};

    if (href!.startsWith('/')) props.component = Link;
    else props.target = '_blank';

    return (
      <Anchor href={href!} {...props}>
        {children}
      </Anchor>
    );
  };

  const customComponents: MDXComponents = {
    a: ({ href, children }) => (
      <DynamicLink href={href}>{children}</DynamicLink>
    ),
    blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
    code: ({ children }) => <InlineCode>{children}</InlineCode>,
    em: ({ children }) => (
      <LargeText component={'span'} fs={'italic'}>
        {children}
      </LargeText>
    ),
    h1: ({ children }) => (
      <LinkedHeading order={1} style={headingStyle(spacing, false)}>
        {children}
      </LinkedHeading>
    ),
    h2: ({ children }) => (
      <LinkedHeading order={2} style={headingStyle(spacing)}>
        {children}
      </LinkedHeading>
    ),
    h3: ({ children }) => (
      <Heading order={3} style={headingStyle(spacing)}>
        {children}
      </Heading>
    ),
    h4: ({ children }) => (
      <Heading order={4} style={headingStyle(spacing)}>
        {children}
      </Heading>
    ),
    h5: ({ children }) => (
      <Heading order={5} style={headingStyle(spacing)}>
        {children}
      </Heading>
    ),
    h6: ({ children }) => (
      <Heading order={6} style={headingStyle(spacing)}>
        {children}
      </Heading>
    ),
    hr: () => <Divider my={'sm'} />,
    li: ({ children }) => (
      <List.Item
        style={{
          paddingBottom: 'calc(var(--mantine-spacing-xs) * 0.5)',
          fontSize: theme.fontSizes.xl,
        }}
      >
        {children}
      </List.Item>
    ),
    ol: ({ children }) => (
      <List mb={'md'} type={'ordered'}>
        {children}
      </List>
    ),
    p: ({ children }) => <LargeText pb={'xs'}>{children}</LargeText>,
    strong: ({ children }) => (
      <LargeText component={'span'} fw={700}>
        {children}
      </LargeText>
    ),
    ul: ({ children }) => (
      <List mb={spacing} type={'unordered'}>
        {children}
      </List>
    ),
    wrapper: ({ children }) => (
      <Center
        style={{
          marginBottom: 'calc(var(--mantine-spacing-xl) * 1.25)',
          marginTop: 'var(--mantine-spacing-xl)',
        }}
      >
        <Box
          style={{ width: '100%', maxWidth: MAX_MDX_CONTENT_WIDTH }}
        >
          {children}
        </Box>
      </Center>
    ),
    BlockCode,
    InlineCode,
    FeaturesBreakdown,
  };

  return {
    ...components,
    ...customComponents,
  };
}
