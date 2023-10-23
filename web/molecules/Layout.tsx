import React from 'react';
import { AppShell } from '@mantine/core';
import Footer from 'atoms/Footer';
import Header from './Header';

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <AppShell
            padding={'sm'}
            fixed={false}
            header={<Header />}
            footer={<Footer />}
        >
            {children}
        </AppShell>
    );
};

export default Layout;
