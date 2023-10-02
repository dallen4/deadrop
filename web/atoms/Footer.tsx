import React from 'react';
import {
    Anchor,
    Footer as BaseFooter,
    useMantineTheme,
    Text,
} from '@mantine/core';
import { useRouter } from 'next/router';
import { HOME_PATH } from '@config/paths';
import { IconBrandGithub } from '@tabler/icons';

const Footer = () => {
    const router = useRouter();
    const theme = useMantineTheme();

    return (
        <BaseFooter
            height={100}
            withBorder={false}
            styles={(theme) => ({
                root: {
                    padding: theme.spacing.md,
                    textAlign: 'center',
                    bottom: 0,
                },
            })}
            fixed={router.pathname !== HOME_PATH}
        >
            <Anchor
                href={'https://github.com/dallen4/deadrop'}
                target={'_blank'}
            >
                <IconBrandGithub color={theme.colors.gray[5]} />
            </Anchor>
            <Text size={'xs'}>
                Copyright &copy;{' '}
                <Anchor href={'https://nieky.info/'} target={'_blank'}>
                    Nieky Allen
                </Anchor>{' '}
                {new Date().getFullYear()}.
            </Text>
        </BaseFooter>
    );
};

export default Footer;
