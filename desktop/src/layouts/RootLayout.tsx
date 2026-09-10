import type { ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { UserButton, SignInButton, useUser } from '@clerk/react';
import {
  AppShell,
  Button,
  Group,
  Anchor,
  Text,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconBook } from '@tabler/icons-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { DESKTOP_DOCS_PATH } from '@shared/config/paths';
import { WEB_URL } from '../env';

// Docs live on the web app, so hand them to the user's browser rather
// than navigating this window away from the app.
const DocsButton = () => (
  <Tooltip label={'Docs'} position={'bottom'} withArrow>
    <ActionIcon
      variant={'subtle'}
      color={'gray'}
      size={'lg'}
      aria-label={'Open documentation'}
      onClick={() => openUrl(`${WEB_URL}${DESKTOP_DOCS_PATH}`)}
    >
      <IconBook size={20} stroke={1.5} />
    </ActionIcon>
  </Tooltip>
);

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
          <Group gap={'sm'}>
            <DocsButton />
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
