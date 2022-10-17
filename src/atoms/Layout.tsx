import React from 'react';
import { AppShell, Footer, Header, Title, Text } from '@mantine/core';

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <AppShell
            padding={'md'}
            styles={{
                body: {
                    justifyContent: 'center',
                },
                main: {
                    maxWidth: '700px',
                },
            }}
            header={
                <Header
                    height={90}
                    withBorder={false}
                    styles={(theme) => ({
                        root: {
                            padding: theme.spacing.md,
                            textAlign: 'center',
                        },
                    })}
                >
                    <Title>deadDrop</Title>
                    <Text>real-time end-to-end encrypted secrets handoff</Text>
                </Header>
            }
            footer={
                <Footer
                    height={60}
                    withBorder={false}
                    styles={(theme) => ({
                        root: {
                            padding: theme.spacing.md,
                            textAlign: 'center',
                        },
                    })}
                >
                    <Text size={'xs'}>
                        Copyright &copy; Nieky Allen {new Date().getFullYear()}.
                    </Text>
                </Footer>
            }
        >
            {children}
        </AppShell>
    );
};

export default Layout;
