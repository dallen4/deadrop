import React from 'react';
import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { DefaultSeo } from 'next-seo';
import { createEmotionCache, MantineProvider } from '@mantine/core';
import Layout from '../atoms/Layout';
import getConfig from 'next/config';

const { publicRuntimeConfig } = getConfig();

const nonce = publicRuntimeConfig.nonce;

export default function MyApp(props: AppProps) {
    const { Component, pageProps } = props;

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
                emotionCache={createEmotionCache({ key: 'styles', nonce })}
            >
                <Layout>
                    <Component {...pageProps} />
                </Layout>
            </MantineProvider>
        </>
    );
}
