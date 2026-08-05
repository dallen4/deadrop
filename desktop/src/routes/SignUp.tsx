import { SignUp } from '@clerk/react';
import { Center } from '@mantine/core';

export const SignUpPage = () => (
  <Center mih={'calc(100vh - 120px)'}>
    <SignUp
      routing={'path'}
      path={'/sign-up'}
      signInUrl={'/sign-in'}
      forceRedirectUrl={'/'}
    />
  </Center>
);
