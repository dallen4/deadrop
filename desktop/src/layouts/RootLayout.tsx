import type { ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { UserButton, SignInButton, useUser } from '@clerk/react';
import { AppShell, Button, Group, Anchor, Text } from '@mantine/core';

const NavLink = ({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) => {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Anchor
      component={Link}
      to={to}
      c={active ? 'gray.0' : 'dimmed'}
      fw={active ? 600 : 500}
      underline={'never'}
      size={'md'}
    >
      {children}
    </Anchor>
  );
};

export const RootLayout = () => {
  const { isSignedIn } = useUser();

  return (
    <AppShell header={{ height: 64 }} padding={'md'}>
      <AppShell.Header>
        <Group h={'100%'} px={'md'} justify={'space-between'}>
          <Group gap={'xl'}>
            <Anchor
              component={Link}
              to={'/'}
              underline={'never'}
              display={'flex'}
              style={{ alignItems: 'center', gap: 10 }}
            >
              <img
                src={'/handshake.svg'}
                alt={''}
                width={40}
                height={40}
              />
              <Text
                fw={700}
                size={'lg'}
                c={'gray.2'}
                style={{ letterSpacing: 0.2 }}
              >
                deadrop
              </Text>
            </Anchor>
            <Group gap={'md'}>
              <NavLink to={'/drop'}>Drop</NavLink>
              <NavLink to={'/grab'}>Grab</NavLink>
              <NavLink to={'/vault'}>Vault</NavLink>
            </Group>
          </Group>
          <Group>
            {isSignedIn ? (
              <UserButton
                appearance={{
                  elements: { avatarBox: { width: 42, height: 42 } },
                }}
              />
            ) : (
              <SignInButton mode={'modal'}>
                <Button size={'sm'} variant={'light'}>
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
