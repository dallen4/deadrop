import React from 'react';
import { Button, Code, Text, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useRouter } from 'next/router';
import { SignedIn, SignedOut, SignIn, useClerk } from '@clerk/nextjs';
import { IconX } from '@tabler/icons-react';
import { MainWrapper } from 'atoms/MainWrapper';
import { parseLoopbackRedirect } from 'lib/loopback';

const PLATFORMS: Record<string, string> = {
  cli: 'CLI',
  vscode: 'VS Code extension',
};

const PlatformAuth = () => {
  const clerk = useClerk();
  const router = useRouter();
  const { platform, redirectUrl, state } = router.query;

  const platformKey = typeof platform === 'string' ? platform : '';

  const retryQuery = new URLSearchParams({
    redirectUrl: typeof redirectUrl === 'string' ? redirectUrl : '',
    state: typeof state === 'string' ? state : '',
  });
  const label = PLATFORMS[platformKey] ?? platformKey;

  const notifyError = (message: string) =>
    showNotification({
      message,
      color: 'red',
      icon: <IconX />,
      autoClose: 4500,
    });

  const getTokenAndRedirect = async () => {
    const localhostRedirect = parseLoopbackRedirect(redirectUrl);

    if (!localhostRedirect) {
      notifyError(
        'Invalid redirect URL, restart the sign-in from your device.',
      );
      return;
    }

    const sessionToken = await clerk.session!.getToken();

    if (!sessionToken) {
      notifyError('Tried to authenticate without a session!');
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

    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.token) {
      notifyError('Failed to generate a sign-in token, please try again.');
      return;
    }

    localhostRedirect.searchParams.set('token', payload.token);
    if (typeof state === 'string')
      localhostRedirect.searchParams.set('state', state);

    window.location.href = localhostRedirect.href;
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
          forceRedirectUrl={`/auth/${encodeURIComponent(
            platformKey,
          )}?${retryQuery}`}
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
