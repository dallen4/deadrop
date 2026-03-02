import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import { MantineProvider } from '@mantine/core';
import { Analytics } from '@vercel/analytics/react';
import { Notifications } from '@mantine/notifications';
import { ClerkProvider } from '@clerk/react-router';
import { dark } from '@clerk/themes';
import { description, title, themeColors } from '../config/app';
import { Assets } from '../atoms/Assets';
import Layout from '../molecules/Layout';
import type { Route } from './+types/root';
import { clerkMiddleware, rootAuthLoader } from '@clerk/react-router/server';
import { nonceMiddleware } from './middleware/nonce';
import { dropLimitMiddleware } from './middleware/drop-limit';

export const middleware: Route.MiddlewareFunction[] = [
  clerkMiddleware(),
  nonceMiddleware,
  dropLimitMiddleware,
];

export async function loader(args: Route.LoaderArgs) {
  return rootAuthLoader(args);
}

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
        />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* PWA properties */}
        <meta name="application-name" content={title} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <meta name="apple-mobile-web-app-title" content={title} />
        <meta name="description" content={description} />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="msapplication-config"
          content="/browserconfig.xml"
        />
        <meta
          name="msapplication-TileColor"
          content={themeColors.primary}
        />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content={themeColors.primary} />

        <Assets />
        <Meta />
        <Links />
      </head>
      <body style={{ backgroundColor: '#242424' }}>
        <MantineProvider
          defaultColorScheme="dark"
          theme={{
            primaryColor: 'blue',
          }}
        >
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root({ loaderData }: Route.ComponentProps) {
  const isPreview =
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.startsWith(
      'pk_test_',
    );

  return (
    <ClerkProvider
      loaderData={loaderData}
      appearance={{
        baseTheme: dark,
      }}
    >
      <Notifications />
      <Layout>
        <Outlet />
      </Layout>
      {!isPreview && <Analytics />}
    </ClerkProvider>
  );
}

export { RootLayout as Layout };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function headers(_: Route.HeadersArgs) {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}
