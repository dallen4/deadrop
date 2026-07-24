import { Link, Outlet } from 'react-router-dom';
import { UserButton, SignInButton, useUser } from '@clerk/react';
import { AppShell, Button, Group, Anchor } from '@mantine/core';

export const RootLayout = () => {
  const { isSignedIn } = useUser();

  return (
    <AppShell header={{ height: 56 }} padding={'md'}>
      <AppShell.Header>
        <Group h={'100%'} px={'md'} justify={'space-between'}>
          <Group gap={'lg'}>
            <Anchor
              component={Link}
              to={'/'}
              fw={700}
              underline={'never'}
            >
              deadrop
            </Anchor>
            <Anchor component={Link} to={'/drop'} c={'dimmed'}>
              Drop
            </Anchor>
            <Anchor component={Link} to={'/grab'} c={'dimmed'}>
              Grab
            </Anchor>
          </Group>
          <Group>
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode={'modal'}>
                <Button size={'xs'} variant={'light'}>
                  Sign in
                </Button>
              </SignInButton>
            )}
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
