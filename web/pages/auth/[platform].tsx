import React from 'react';
import { Button, Code, Text, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useRouter } from 'next/router';
import { SignedIn, SignedOut, SignIn, useClerk } from '@clerk/nextjs';
import { IconX } from '@tabler/icons-react';
import { MainWrapper } from 'atoms/MainWrapper';

const PLATFORMS: Record<string, string> = {
  cli: 'CLI',
  vscode: 'VS Code extension',
};

const PlatformAuth = () => {
  const clerk = useClerk();
  const router = useRouter();
  const { platform, redirectUrl } = router.query;

  const platformKey = typeof platform === 'string' ? platform : '';
  const label = PLATFORMS[platformKey] ?? platformKey;

  const getTokenAndRedirect = async () => {
    const sessionToken = await clerk.session!.getToken();

    if (!sessionToken) {
      showNotification({
        message: 'Tried to authenticate without a session!',
        color: 'red',
        icon: <IconX />,
        autoClose: 4500,
      });
      return;
    }

    const apiUrl = new URL(process.env.NEXT_PUBLIC_DEADROP_API_URL!);
    apiUrl.pathname = '/auth/token';

    const res = await fetch(apiUrl.toString(), {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    });

    const payload = await res.json();

    if (typeof redirectUrl === 'string') {
      const localhostRedirect = new URL(redirectUrl);
      localhostRedirect.searchParams.set('token', payload.token);

      window.location.href = localhostRedirect.href;
    }
  };

  return (
    <MainWrapper
      style={{
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}
    >
      <SignedOut>
        <SignIn
          routing={'hash'}
          forceRedirectUrl={`/auth/${platformKey}?redirectUrl=${redirectUrl}`}
        />
      </SignedOut>
      <SignedIn>
        <Title>deadrop {label} Authentication</Title>
        <Text>
          Do you want to authorize the <Code>deadrop {label}</Code> on
          this device?
        </Text>
        <Button onClick={getTokenAndRedirect}>Yes, sign me in</Button>
      </SignedIn>
    </MainWrapper>
  );
};

export default PlatformAuth;
