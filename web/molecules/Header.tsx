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
import { LOGIN_PATH, LOGOUT_PATH } from '@shared/config/paths';

const Header = () => {
    const router = useRouter();
    const { user, isLoading } = useUser();

    const onLogin = () => router.push(LOGIN_PATH);

    return (
        <BaseHeader
            height={102}
            withBorder={false}
            styles={(theme) => ({
                root: {
                    padding: theme.spacing.xl,
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
                <Box
                    style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
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
                </Box>
            </Flex>
        </BaseHeader>
    );
};

export default Header;
