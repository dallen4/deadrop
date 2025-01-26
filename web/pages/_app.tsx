import React from 'react';
import { AppProps } from 'next/app';
import { DefaultSeo } from 'next-seo';
import { MantineProvider } from '@mantine/core';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Layout from 'molecules/Layout';
import { emotionCache } from 'lib/emotion';
import { NotificationsProvider } from '@mantine/notifications';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import Head from 'next/head';
import { description, title } from '@config/app';

export default function MyApp(props: AppProps) {
  const { Component, pageProps } = props;

  const isPreview =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith(
      'pk_test_',
    );

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
        appearance={{
          baseTheme: dark,
        }}
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
        {!isPreview && <Analytics />}
        <SpeedInsights />
      </ClerkProvider>
    </>
  );
}
