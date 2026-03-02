import React from 'react';
import { Button, Container, Text, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useSearchParams } from 'react-router';
import { SignedIn, SignedOut, SignIn, useClerk } from '@clerk/react-router';
import { IconX } from '@tabler/icons-react';
import { buildMeta } from '~/lib/meta';
import { CLI_AUTH_PATH } from '@shared/config/paths';

export function meta() {
  return buildMeta({
    title: 'CLI Authentication',
    description: 'Authenticate the deadrop CLI tool with your account',
    url: CLI_AUTH_PATH,
    noIndex: true,
  });
}

export default function CliAuth() {
  const clerk = useClerk();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirectUrl');

  const getTokenAndRedirect = async () => {
    const sessionToken = await clerk.session!.getToken();

    if (!sessionToken) {
      showNotification({
        message: 'Tried to authenticate CLI without a session!',
        color: 'red',
        icon: <IconX />,
        autoClose: 4500,
      });
      return;
    }

    const apiUrl = new URL(import.meta.env.VITE_DEADROP_API_URL!);
    apiUrl.pathname = '/auth/token';

    const res = await fetch(apiUrl.toString(), {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    });

    const payload = await res.json<{ token: string }>();

    if (typeof redirectUrl === 'string') {
      const localhostRedirect = new URL(redirectUrl);
      localhostRedirect.searchParams.set('token', payload.token);

      window.location.href = localhostRedirect.href;
    }
  };

  return (
    <Container
      maw={'700px'}
      mih={'calc(100vh - 225px)'}
      p={0}
      display={'flex'}
      style={{
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}
    >
      <SignedOut>
        <SignIn
          routing={'hash'}
          forceRedirectUrl={`/auth/cli?redirectUrl=${redirectUrl}`}
        />
      </SignedOut>
      <SignedIn>
        <Title>deadrop CLI Authentication</Title>
        <Text>
          Do you want to authorize the CLI on this computer?
        </Text>
        <Button onClick={getTokenAndRedirect}>Yes, sign me in</Button>
      </SignedIn>
    </Container>
  );
}