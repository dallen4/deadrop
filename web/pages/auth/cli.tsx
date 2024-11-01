import React from 'react';
import { Button, Container, Text, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useRouter } from 'next/router';
import { SignedIn, SignedOut, SignIn, useClerk } from '@clerk/nextjs';
import { IconX } from '@tabler/icons';

const CliAuth = () => {
  const clerk = useClerk();
  const router = useRouter();
  const { redirectUrl } = router.query;

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

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_DEADROP_API_URL!}/auth/token`,
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const payload = await res.json();

    if (typeof redirectUrl === 'string') {
      const localhostRedirect = new URL(redirectUrl);
      localhostRedirect.searchParams.set('token', payload.token);
      console.log(localhostRedirect.href);
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
};

export default CliAuth;
