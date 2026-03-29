import React from 'react';
import { Button, Text, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useRouter } from 'next/router';
import { SignedIn, SignedOut, SignIn, useClerk } from '@clerk/nextjs';
import { IconX } from '@tabler/icons-react';
import { MainWrapper } from 'atoms/MainWrapper';

const VscodeAuth = () => {
  const clerk = useClerk();
  const router = useRouter();
  const { state } = router.query;

  const getTokenAndRedirect = async () => {
    const sessionToken = await clerk.session!.getToken();

    if (!sessionToken) {
      showNotification({
        message: 'Tried to authenticate VS Code extension without a session!',
        color: 'red',
        icon: <IconX />,
        autoClose: 4500,
      });
      return;
    }

    const redirectUrl = new URL('vscode://deadrop.vscode');
    redirectUrl.searchParams.set('token', sessionToken);
    if (typeof state === 'string') {
      redirectUrl.searchParams.set('state', state);
    }

    window.location.href = redirectUrl.href;
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
          forceRedirectUrl={`/auth/vscode?state=${state}`}
        />
      </SignedOut>
      <SignedIn>
        <Title>deadrop VS Code Authentication</Title>
        <Text>
          Do you want to authorize the deadrop extension in VS Code?
        </Text>
        <Button onClick={getTokenAndRedirect}>Yes, sign me in</Button>
      </SignedIn>
    </MainWrapper>
  );
};

export default VscodeAuth;
