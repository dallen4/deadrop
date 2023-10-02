import React from 'react';
import {
    Avatar,
    Header as BaseHeader,
    Box,
    Button,
    Flex,
    Loader,
    Popover,
    useMantineTheme,
} from '@mantine/core';
import Brand from 'atoms/header/Brand';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/router';

const Header = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const { user, error, isLoading } = useUser();

    const onLogin = () => router.push('/api/auth/login');

    return (
        <BaseHeader
            height={90}
            withBorder={false}
            styles={(theme) => ({
                root: {
                    padding: theme.spacing.lg,
                },
            })}
        >
            <Flex direction="row">
                <Box
                    style={{
                        flex: 1,
                        justifyContent: 'flex-start',
                        padding: theme.spacing.md,
                    }}
                >
                    <Brand />
                </Box>
                <Box
                    style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        padding: theme.spacing.md,
                    }}
                >
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
                                <a href={'/api/auth/logout'}>Logout</a>
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
                </Box>
            </Flex>
        </BaseHeader>
    );
};

export default Header;
