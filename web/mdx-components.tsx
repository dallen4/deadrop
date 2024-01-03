import { MAX_MDX_CONTENT_WIDTH } from '@config/app';
import {
    Blockquote,
    Code,
    Title,
    Text,
    List,
    Divider,
    Box,
    Center,
    useMantineTheme,
    Anchor,
} from '@mantine/core';
import { InlineCode } from 'atoms/Code';
import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import { AnchorHTMLAttributes, DetailedHTMLProps } from 'react';

export function useMDXComponents(components: MDXComponents): MDXComponents {
    const theme = useMantineTheme();

    const LargeText = (props: any) => (
        <Text size={theme.fontSizes.lg} {...props} />
    );

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
            <Title
                order={1}
                style={{
                    paddingBottom: theme.spacing.sm,
                }}
            >
                {children}
            </Title>
        ),
        h2: ({ children }) => (
            <Title
                order={2}
                style={{
                    paddingTop: theme.spacing.sm,
                    paddingBottom: theme.spacing.sm,
                }}
            >
                {children}
            </Title>
        ),
        h3: ({ children }) => (
            <Title
                order={3}
                style={{
                    paddingTop: theme.spacing.sm,
                    paddingBottom: theme.spacing.sm,
                }}
            >
                {children}
            </Title>
        ),
        h4: ({ children }) => (
            <Title
                order={4}
                style={{
                    paddingTop: theme.spacing.sm,
                    paddingBottom: theme.spacing.sm,
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
                    paddingBottom: theme.spacing.sm,
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
                    paddingBottom: theme.spacing.sm,
                }}
            >
                {children}
            </Title>
        ),
        hr: () => <Divider my={'sm'} />,
        li: ({ children }) => (
            <List.Item style={{ paddingBottom: theme.spacing.xs * 0.7 }}>
                {children}
            </List.Item>
        ),
        ol: ({ children }) => (
            <List mb={theme.spacing.md} type={'ordered'}>
                {children}
            </List>
        ),
        p: ({ children }) => (
            <LargeText pb={theme.spacing.xs}>{children}</LargeText>
        ),
        strong: ({ children }) => (
            <LargeText component={'span'} fw={700}>
                {children}
            </LargeText>
        ),
        ul: ({ children }) => (
            <List mb={theme.spacing.xs} type={'unordered'}>
                {children}
            </List>
        ),
        wrapper: ({ children }) => (
            <Center
                style={{
                    marginBottom: theme.spacing.xl * 1.25,
                    marginTop: theme.spacing.xl,
                }}
            >
                <Box style={{ width: '100%', maxWidth: MAX_MDX_CONTENT_WIDTH }}>
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
