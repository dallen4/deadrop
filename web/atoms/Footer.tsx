import React from 'react';
import {
    Anchor,
    Footer as BaseFooter,
    useMantineTheme,
    Text,
} from '@mantine/core';
import { useRouter } from 'next/router';
import { IconBrandGithub } from '@tabler/icons';
import { DROP_PATH, GRAB_PATH } from '@shared/config/paths';

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
            fixed={[DROP_PATH, GRAB_PATH].includes(router.pathname)}
        >
            <Anchor
                href={'https://github.com/dallen4/deadrop'}
                target={'_blank'}
            >
                <IconBrandGithub color={theme.colors.gray[5]} />
            </Anchor>
            <Text size={'xs'}>
                &copy; {new Date().getFullYear()} deadrop by{' '}
                <Anchor href={'https://nieky.info/'} target={'_blank'}>
                    Nieky
                </Anchor>
                .
            </Text>
        </BaseFooter>
    );
};

export default Footer;
