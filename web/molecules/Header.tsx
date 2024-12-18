import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import {
  Header as BaseHeader,
  Box,
  Button,
  createStyles,
  Flex,
  Group,
  Loader,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { OVERVIEW_DOCS_PATH } from '@shared/config/paths';
import Brand from 'atoms/header/Brand';
import { useRouter } from 'next/router';

const useStyles = createStyles((theme) => ({
  navButton: {
    fontWeight: 'bold',
  },
}));

const Header = () => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { classes, theme } = useStyles();
  const isMobile = useMediaQuery(
    `(max-width: ${theme.breakpoints.sm}px)`,
  );

  // const onLogin = () => router.push(LOGIN_PATH);

  const onDocsClick = () => router.push(OVERVIEW_DOCS_PATH);

  return (
    <BaseHeader
      height={102}
      withBorder={false}
      styles={(theme) => ({
        root: {
          padding: isMobile ? theme.spacing.md : theme.spacing.xl,
        },
      })}
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
            <Button
              variant={'outline'}
              style={{ minWidth: '75px' }}
              disabled={!isLoaded}
              component={SignInButton}
              // forceRedirectUrl={`/signin?redirectUrl=${router.query.redirectUrl}`}
            >
              {!isLoaded ? (
                <Loader color={'blue'} size={'sm'} />
              ) : (
                'Login'
              )}
            </Button>
          )}
        </Group>
      </Flex>
    </BaseHeader>
  );
};

export default Header;
