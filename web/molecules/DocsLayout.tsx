import React, { useEffect } from 'react';
import {
  Box,
  Burger,
  Divider,
  Drawer,
  Flex,
  NavLink,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  CLI_DOCS_PATH,
  FAQS_DOCS_PATH,
  FEATURES_DOCS_PATH,
  OVERVIEW_DOCS_PATH,
  VSCODE_DOCS_PATH,
} from '@shared/config/paths';

const SIDEBAR_WIDTH = 220;

const topLinks = [
  { label: 'Overview', href: OVERVIEW_DOCS_PATH },
  { label: 'Features & Roadmap', href: FEATURES_DOCS_PATH },
  { label: 'FAQs', href: FAQS_DOCS_PATH },
];

const featureLinks = [
  // { label: 'Web App', href: WEB_DOCS_PATH },
  { label: 'CLI', href: CLI_DOCS_PATH },
  { label: 'VS Code', href: VSCODE_DOCS_PATH },
];

type NavContentProps = {
  pathname: string;
  onNavigate?: () => void;
  large?: boolean;
};

const NavContent = ({
  pathname,
  onNavigate,
  large,
}: NavContentProps) => {
  const linkStyles = large
    ? {
        root: { paddingTop: 14, paddingBottom: 14 },
        label: { fontSize: 'var(--mantine-font-size-lg)' },
      }
    : {
        label: { fontSize: 'var(--mantine-font-size-md)' },
      };
  return (
    <>
      {topLinks.map(({ label, href }) => (
        <NavLink
          key={href}
          component={Link}
          href={href}
          label={label}
          active={pathname === href}
          onClick={onNavigate}
          styles={linkStyles}
        />
      ))}
      <Divider
        ml={large ? 'md' : 'xs'}
        mr={large ? 'md' : undefined}
        my="xs"
        label="By surface"
        labelPosition="left"
      />
      {featureLinks.map(({ label, href }) => (
        <NavLink
          key={href}
          component={Link}
          href={href}
          label={label}
          active={pathname === href}
          onClick={onNavigate}
          styles={linkStyles}
        />
      ))}
    </>
  );
};

const DocsLayout = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useRouter();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${theme.breakpoints.sm})`,
  );
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  if (isMobile) {
    return (
      <Flex
        direction="column"
        style={{
          minHeight: 'calc(100vh - 102px)',
          marginTop: 'calc(-1 * var(--mantine-spacing-md))',
        }}
      >
        <Box
          style={{
            position: 'sticky',
            top: 102,
            zIndex: 10,
            padding: 'var(--mantine-spacing-sm)',
            background: 'var(--mantine-color-body)',
            borderBottom: `1px solid ${theme.colors.dark[4]}`,
            marginLeft: 'calc(-1 * var(--mantine-spacing-md))',
            marginRight: 'calc(-1 * var(--mantine-spacing-md))',
          }}
        >
          <Burger
            opened={drawerOpened}
            onClick={openDrawer}
            aria-label="Toggle docs navigation"
            size="sm"
          />
        </Box>
        <Drawer
          opened={drawerOpened}
          onClose={closeDrawer}
          title="Docs"
          size="xs"
          styles={{ body: { padding: 0 } }}
        >
          <NavContent
            pathname={pathname}
            onNavigate={closeDrawer}
            large
          />
        </Drawer>
        <Box style={{ minWidth: 0 }}>{children}</Box>
      </Flex>
    );
  }

  return (
    <Flex
      direction="row"
      style={{
        minHeight: 'calc(100vh - 102px)',
        marginTop: 'calc(-1 * var(--mantine-spacing-md))',
      }}
    >
      <Box
        w={SIDEBAR_WIDTH}
        style={{
          borderRight: `1px solid ${theme.colors.dark[4]}`,
          position: 'sticky',
          top: 102,
          height: 'calc(100vh - 102px)',
          overflowY: 'auto',
          paddingTop: 'var(--mantine-spacing-md)',
          paddingBottom: 'var(--mantine-spacing-md)',
          marginLeft: 'calc(-1 * var(--mantine-spacing-md))',
          flexShrink: 0,
        }}
      >
        <NavContent pathname={pathname} />
      </Box>
      <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Flex>
  );
};

export default DocsLayout;
