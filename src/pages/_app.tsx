import React from 'react';
import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { DefaultSeo } from 'next-seo';
import { MantineProvider } from '@mantine/core';
import Layout from '../atoms/Layout';

export default function MyApp(props: AppProps) {
    const { Component, pageProps } = props;
    const Router = useRouter();

    React.useEffect(() => {
        // Remove the server-side injected CSS
        const jssStyles = document.querySelector('#jss-server-side');
        if (jssStyles && jssStyles.parentElement) {
            jssStyles.parentElement.removeChild(jssStyles);
        }
    }, []);

    return (
        <>
            <DefaultSeo
                title={'Dead Drop'}
                description={'e2e enncrypted secret sharing'}
                openGraph={{}}
            />
            <MantineProvider
                withGlobalStyles
                withNormalizeCSS
                theme={{
                    colorScheme: 'dark',
                }}
            >
                <Layout>
                    <Component {...pageProps} />
                </Layout>
            </MantineProvider>
        </>
    );
}
