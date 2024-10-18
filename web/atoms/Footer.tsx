import React from 'react';
import {
  Anchor,
  Footer as BaseFooter,
  useMantineTheme,
  Text,
} from '@mantine/core';
import { useRouter } from 'next/router';
import { IconBrandGithub } from '@tabler/icons';

const Footer = () => {
  const router = useRouter();
  const theme = useMantineTheme();

  return (
    <BaseFooter
      height={100}
      withBorder={false}
      styles={(theme) => ({
        root: {
          padding: theme.spacing.md,
          textAlign: 'center',
          bottom: 0,
        },
      })}
    >
      <Anchor
        href={'https://github.com/dallen4/deadrop'}
        target={'_blank'}
      >
        <IconBrandGithub color={theme.colors.gray[5]} />
      </Anchor>
      <Text size={'xs'}>
        &copy; {new Date().getFullYear()} deadrop by{' '}
        <Anchor href={'https://nieky.info/'} target={'_blank'}>
          nieky
        </Anchor>
        .
      </Text>
      <Text size={'xs'} c={'dimmed'} fw={500}>
        v{require('../package.json').version}
      </Text>
    </BaseFooter>
  );
};

export default Footer;
