import React from 'react';
import {
  Anchor,
  useMantineTheme,
  Text,
} from '@mantine/core';
import { IconBrandGithub } from '@tabler/icons-react';

const Footer = () => {
  const theme = useMantineTheme();

  return (
    <div
      style={{
        height: 100,
        padding: 'var(--mantine-spacing-md)',
        textAlign: 'center',
      }}
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
    </div>
  );
};

export default Footer;
