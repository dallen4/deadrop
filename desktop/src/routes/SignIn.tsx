import { SignIn } from '@clerk/react';
import { Center } from '@mantine/core';

// Email/password + email-OTP run entirely in-webview. OAuth providers (if
// enabled in the Clerk dashboard) redirect via the system browser and
// complete through the deadrop:// deep link in packaged builds.
export const SignInPage = () => (
  <Center mih={'calc(100vh - 120px)'}>
    <SignIn
      routing={'path'}
      path={'/sign-in'}
      signUpUrl={'/sign-up'}
      forceRedirectUrl={'/'}
    />
  </Center>
);
