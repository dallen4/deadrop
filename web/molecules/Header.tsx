import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from '@clerk/nextjs';
import {
  Avatar,
  Header as BaseHeader,
  Box,
  Button,
  Flex,
  Group,
  Loader,
  Popover,
  createStyles,
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
  console.log(user);
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
          <SignedIn>
            <UserButton />
          </SignedIn>
          {user ? (
            <Popover position={'bottom-end'}>
              <Popover.Target>
                <Avatar
                  src={user!.imageUrl}
                  style={{
                    float: 'right',
                    cursor: 'pointer',
                  }}
                  size={'lg'}
                >
                  {user!.emailAddresses[0].emailAddress[0]}
                </Avatar>
              </Popover.Target>
              <Popover.Dropdown>
                <UserButton />
              </Popover.Dropdown>
            </Popover>
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
