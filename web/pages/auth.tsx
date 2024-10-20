import React from 'react';
import {
  Button,
  Container,
  Text,
  Title
} from '@mantine/core';

const Auth = () => {
  const getTokenAndRedirect = async () => {
    const res = await fetch(
      'https://deadrop.nieky.workers.dev/auth/token',
    );
    const payload = await res.json();

    const currentUrl = new URL(window.location.href);
    const redirectParam = currentUrl.searchParams.get('redirectUrl');

    if (redirectParam) {
      const redirectUrl = new URL(redirectParam);
      redirectUrl.searchParams.set('token', payload.token);

      window.location.href = redirectUrl.href;
    }
  };

  return (
    <Container maw={'700px'} mih={'calc(100vh - 225px)'} p={0}>
      <Title>deadrop CLI Authentication</Title>
      <Text>Do you want to authorize this CLI?</Text>
      <Button onClick={getTokenAndRedirect}>Yes, sign me in</Button>
    </Container>
  );
};

export default Auth;
