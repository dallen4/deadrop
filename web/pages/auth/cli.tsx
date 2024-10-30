import React from 'react';
import { Button, Container, Text, Title } from '@mantine/core';
import { useRouter } from 'next/router';
import { SignedIn, SignedOut, SignIn } from '@clerk/nextjs';

const CliAuth = () => {
  const router = useRouter();
  const { redirectUrl } = router.query;

  const getTokenAndRedirect = async () => {
    const res = await fetch(
      'https://deadrop.nieky.workers.dev/auth/token',
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
