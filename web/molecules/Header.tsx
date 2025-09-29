import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import {
  Box,
  Button,
  Flex,
  Group,
  Loader,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { OVERVIEW_DOCS_PATH } from '@shared/config/paths';
import Brand from 'atoms/header/Brand';
import { useRouter } from 'next/router';

import classes from './Header.module.css';

const Header = () => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${theme.breakpoints.sm}px)`,
  );

  const onDocsClick = () => router.push(OVERVIEW_DOCS_PATH);

  return (
    <div
      style={{
        height: 102,
        padding: isMobile ? 'var(--mantine-spacing-md)' : 'var(--mantine-spacing-xl)',
      }}
    >
      <Flex direction={'row'} justify={'space-between'}>
        <Box
          style={{
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}
        >
          <Brand />
        </Box>
        <Group ml={50}>
          <Button
            variant={'subtle'}
            className={classes.navButton}
            onClick={onDocsClick}
          >
            Docs
          </Button>
          {user ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: {
                    height: '50px',
                    width: '50px',
                  },
                },
              }}
            />
          ) : (
            <SignInButton>
              <Button
                variant={'outline'}
                style={{ minWidth: '75px' }}
                disabled={!isLoaded}
                // forceRedirectUrl={`/signin?redirectUrl=${router.query.redirectUrl}`}
              >
                {!isLoaded ? (
                  <Loader color={'blue'} size={'sm'} />
                ) : (
                  'Login'
                )}
              </Button>
            </SignInButton>
          )}
        </Group>
      </Flex>
    </div>
  );
};

export default Header;
