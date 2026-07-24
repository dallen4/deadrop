import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { RouterProvider } from 'react-router-dom';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';

import { CLERK_PUBLISHABLE_KEY } from './env';
import { router } from './router';

ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <MantineProvider
        defaultColorScheme={'dark'}
        theme={{ primaryColor: 'blue' }}
      >
        <Notifications />
        <RouterProvider router={router} />
      </MantineProvider>
    </ClerkProvider>
  </React.StrictMode>,
);
