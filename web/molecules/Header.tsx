import React from 'react';
import {
    Avatar,
    Header as BaseHeader,
    Box,
    Button,
    Flex,
    Group,
    Loader,
    Popover,
    createStyles,
} from '@mantine/core';
import Brand from 'atoms/header/Brand';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/router';
import {
    LOGIN_PATH,
    LOGOUT_PATH,
    OVERVIEW_DOCS_PATH,
} from '@shared/config/paths';
import { useMediaQuery } from '@mantine/hooks';

const useStyles = createStyles((theme) => ({
    navButton: {
        fontWeight: 'bold',
    },
}));

const Header = () => {
    const router = useRouter();
    const { user, isLoading } = useUser();
    const { classes, theme } = useStyles();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);

    const onLogin = () => router.push(LOGIN_PATH);

    const onDocsClick = () => router.push(OVERVIEW_DOCS_PATH);

    return (
        <BaseHeader
            height={102}
            withBorder={false}
            styles={(theme) => ({
                root: {
                    padding: isMobile ? theme.spacing.md : theme.spacing.xl,
                },
            })}
        >
            <Flex direction="row">
                <Box
                    style={{
                        flex: 1,
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                    }}
                >
                    <Brand />
                </Box>
                <Group ml={50}>
                    <Button
                        variant={'subtle'}
                        className={classes.navButton}
                        onClick={onDocsClick}
                    >
                        Docs
                    </Button>
                    {user ? (
                        <Popover position={'bottom-end'}>
                            <Popover.Target>
                                <Avatar
                                    src={user!.picture!}
                                    style={{
                                        float: 'right',
                                        cursor: 'pointer',
                                    }}
                                    size={'lg'}
                                >
                                    {user!.name![0]}
                                </Avatar>
                            </Popover.Target>
                            <Popover.Dropdown>
                                <a href={LOGOUT_PATH}>Logout</a>
                            </Popover.Dropdown>
                        </Popover>
                    ) : (
                        <Button
                            variant={'outline'}
                            onClick={onLogin}
                            style={{ minWidth: '75px' }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader color={'blue'} size={'sm'} />
                            ) : (
                                'Login'
                            )}
                        </Button>
                    )}
                </Group>
            </Flex>
        </BaseHeader>
    );
};

export default Header;
