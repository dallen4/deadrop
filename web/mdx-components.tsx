import { MAX_MDX_CONTENT_WIDTH } from '@config/app';
import {
  Anchor,
  Blockquote,
  Box,
  Center,
  Divider,
  List,
  PolymorphicComponentProps,
  Text,
  TextProps,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { BlockCode, InlineCode } from 'atoms/Code';
import { useMobile } from 'hooks/use-mobile';
import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AnchorHTMLAttributes, DetailedHTMLProps } from 'react';

export function useMDXComponents(
  components: MDXComponents,
): MDXComponents {
  const theme = useMantineTheme();
  const isMobile = useMobile();
  const { pathname } = useRouter();
  const isDocs = pathname.startsWith('/docs');

  const LargeText = (
    props: PolymorphicComponentProps<'p' | 'span', TextProps>,
  ) => <Text size={'lg'} {...props} />;

  const DynamicLink = ({
    href,
    children,
  }: DetailedHTMLProps<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  >) => {
    const props: any = {};

    if (href!.startsWith('/')) props.component = Link;
    else props.target = '_blank';

    return (
      <Anchor href={href!} size={'lg'} {...props}>
        {children}
      </Anchor>
    );
  };

  const customComponents: MDXComponents = {
    a: ({ href, children }) => (
      <DynamicLink href={href}>{children}</DynamicLink>
    ),
    blockquote: ({ children }) => (
      <Blockquote
        color={'blue'}
        mt={'md'}
        mb={'lg'}
        pl={'lg'}
        fz={'lg'}
      >
        {children}
      </Blockquote>
    ),
    code: ({ children }) =>
      typeof children === 'string' && !children.includes('\n') ? (
        <InlineCode size={'md'}>{children}</InlineCode>
      ) : (
        <BlockCode>{children}</BlockCode>
      ),
    em: ({ children }) => (
      <LargeText component={'span'} fs={'italic'}>
        {children}
      </LargeText>
    ),
    h1: ({ children }) => (
      <Title
        order={1}
        style={{
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.md,
        }}
      >
        {children}
      </Title>
    ),
    h2: ({ children }) => (
      <Title
        order={2}
        style={{
          paddingTop: theme.spacing.xl,
          paddingBottom: theme.spacing.sm,
          borderBottom: `1px solid light-dark(${theme.colors.gray[2]}, ${theme.colors.dark[4]})`,
          marginBottom: theme.spacing.sm,
        }}
      >
        {children}
      </Title>
    ),
    h3: ({ children }) => (
      <Title
        order={3}
        style={{
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.xs,
        }}
      >
        {children}
      </Title>
    ),
    h4: ({ children }) => (
      <Title
        order={4}
        style={{
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.xs,
        }}
      >
        {children}
      </Title>
    ),
    h5: ({ children }) => (
      <Title
        order={5}
        style={{
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.xs,
        }}
      >
        {children}
      </Title>
    ),
    h6: ({ children }) => (
      <Title
        order={6}
        style={{
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.xs,
        }}
      >
        {children}
      </Title>
    ),
    hr: () => <Divider my={'lg'} />,
    li: ({ children }) => (
      <List.Item
        style={{
          paddingBottom: 'calc(var(--mantine-spacing-xs) * 0.3)',
          fontSize: 'lg',
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
    p: ({ children }) => (
      <LargeText
        styles={{
          root: {
            lineHeight: 1.5,
          },
        }}
      >
        {children}
      </LargeText>
    ),
    strong: ({ children }) => (
      <LargeText component={'span'} fw={700}>
        {children}
      </LargeText>
    ),
    ul: ({ children }) => (
      <List mb={'md'} type={'unordered'}>
        {children}
      </List>
    ),
    wrapper: ({ children }) => (
      <Center
        style={{
          marginBottom: 'calc(var(--mantine-spacing-xl) * 1.25)',
          marginTop: isDocs ? undefined : 'var(--mantine-spacing-xl)',
          paddingLeft:
            isDocs && !isMobile ? theme.spacing.xl : undefined,
          paddingRight:
            isDocs && !isMobile ? theme.spacing.xl : undefined,
        }}
      >
        <Box
          style={{
            width: '100%',
            maxWidth: MAX_MDX_CONTENT_WIDTH,
          }}
        >
          {children}
        </Box>
      </Center>
    ),
  };

  return {
    ...components,
    ...customComponents,
  };
}
