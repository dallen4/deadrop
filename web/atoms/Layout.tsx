import React from 'react';
import {
    Anchor,
    AppShell,
    Avatar,
    Box,
    Button,
    Flex,
    Footer,
    Header,
    NavLink,
    Popover,
    Text,
    createStyles,
    useMantineTheme,
} from '@mantine/core';
import { useRouter } from 'next/router';
import { HOME_PATH } from '@config/paths';
import Link from 'next/link';
import { IconBrandGithub } from '@tabler/icons';
import { useUser } from '@auth0/nextjs-auth0/client';

const useStyles = createStyles((theme) => ({
    headerName: {
        ...theme.headings.sizes.h1,
        fontWeight: 'bold',
        float: 'left',
        ':hover': {
            cursor: 'pointer',
            color: theme.colors[theme.primaryColor][4],
        },
    },
}));

const Layout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const { classes } = useStyles();
    const theme = useMantineTheme();
    const { user, error, isLoading } = useUser();

    return (
        <AppShell
            padding={'md'}
            fixed={false}
            header={
                <Header
                    height={90}
                    withBorder={false}
                    styles={(theme) => ({
                        root: {
                            padding: theme.spacing.lg,
                        },
                    })}
                >
                    <Flex direction="row">
                        <Box style={{ flex: 1, justifyContent: 'flex-start' }}>
                            <Link href={HOME_PATH}>
                                <Text className={classes.headerName}>
                                    deadrop
                                </Text>
                            </Link>
                        </Box>
                        <Box
                            style={{
                                flex: 1,
                                justifyContent: 'flex-end',
                                padding: theme.spacing.md,
                            }}
                        >
                            {!user && !isLoading ? (
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        router.push('/api/auth/login')
                                    }
                                    style={{ float: 'right' }}
                                >
                                    Login
                                </Button>
                            ) : (
                                <Popover position="bottom-end">
                                    <Popover.Target>
                                        <Avatar
                                            src={user?.picture!}
                                            style={{ float: 'right' }}
                                        >
                                            {user?.name![0]}
                                        </Avatar>
                                    </Popover.Target>
                                    <Popover.Dropdown>
                                        <a href={'/api/auth/logout'}>Logout</a>
                                    </Popover.Dropdown>
                                </Popover>
                            )}
                        </Box>
                    </Flex>
                </Header>
            }
            footer={
                <Footer
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
                </Footer>
            }
        >
            {children}
        </AppShell>
    );
};

export default Layout;
