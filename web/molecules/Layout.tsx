import React from 'react';
import { AppShell } from '@mantine/core';
import Footer from 'atoms/Footer';
import Header from './Header';

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <AppShell
            padding={'md'}
            header={{ height: 102 }}
        >
            <AppShell.Header withBorder={false}>
                <Header />
            </AppShell.Header>
            <AppShell.Main>
                {children}
                <Footer />
            </AppShell.Main>
        </AppShell>
    );
};

export default Layout;
