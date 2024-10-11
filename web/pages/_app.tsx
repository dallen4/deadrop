import React from 'react';
import { AppProps } from 'next/app';
import { DefaultSeo } from 'next-seo';
import { MantineProvider } from '@mantine/core';
import { Analytics } from '@vercel/analytics/react';
import Layout from 'molecules/Layout';
import { emotionCache } from 'lib/emotion';
import { NotificationsProvider } from '@mantine/notifications';
import { ClerkProvider } from '@clerk/nextjs';
import Head from 'next/head';
import { description, title } from '@config/app';

export default function MyApp(props: AppProps) {
  const { Component, pageProps } = props;

  return (
    <>
      <DefaultSeo
        title={title}
        description={description}
        openGraph={{
          title,
          description,
          type: 'website',
          site_name: title,
          url: 'https://deadrop.io',
          images: [],
        }}
        twitter={{
          cardType: 'app',
        }}
      />
      <Head>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
        />
      </Head>
      <ClerkProvider
        publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        {...pageProps}
      >
        <MantineProvider
          withGlobalStyles
          withNormalizeCSS
          theme={{
            colorScheme: 'dark',
          }}
          emotionCache={emotionCache}
        >
          <NotificationsProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </NotificationsProvider>
        </MantineProvider>
        <Analytics />
      </ClerkProvider>
    </>
  );
}
