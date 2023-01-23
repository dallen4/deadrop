import React from 'react';
import {
    AppShell,
    Footer,
    Header,
    Text,
    createStyles,
} from '@mantine/core';
import { useRouter } from 'next/router';
import { HOME_PATH } from '@config/paths';
import Link from 'next/link';

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
                    <Link href={HOME_PATH}>
                        <Text className={classes.headerName}>deadrop</Text>
                    </Link>
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
                            bottom: 0,
                        },
                    })}
                    fixed={router.pathname !== HOME_PATH}
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
