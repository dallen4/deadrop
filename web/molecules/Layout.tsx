import React from 'react';
import { AppShell } from '@mantine/core';
import Footer from 'atoms/Footer';
import Header from './Header';

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <AppShell
            padding={'md'}
            fixed={false}
            header={<Header />}
            footer={<Footer />}
        >
            <main>{children}</main>
        </AppShell>
    );
};

export default Layout;
