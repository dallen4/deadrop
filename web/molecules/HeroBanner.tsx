import React from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Code,
  Container,
  CopyButton,
  Divider,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
} from '@mantine/core';
import {
  IconCheck,
  IconChevronDown,
  IconCopy,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { DROP_PATH } from '@shared/config/paths';
import { TypeAnimation } from 'react-type-animation';

// based off of: https://ui.mantine.dev/category/hero

import classes from './HeroBanner.module.css';

const INSTALL_COMMAND = 'curl -fsSL deadrop.io/install.sh | sh';

export function HeroBanner() {
  const theme = useMantineTheme();
  const router = useRouter();

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.inner}>
        <Title className={classes.brandName}>
          dea<span className={classes.brandNameDrop}>drop</span>
        </Title>
        <Title className={classes.title}>
          Quickly and securely share
          <br />
          <TypeAnimation
            sequence={[
              'passwords',
              2500,
              'API keys',
              2500,
              '.env files',
              2500,
              'secrets',
              2500,
            ]}
            wrapper={'span'}
            className={classes.highlight}
            speed={15}
            repeat={Infinity}
          />
        </Title>

        <Container size={640} p={0}>
          <Text size={'lg'} className={classes.description}>
            Avoid messy and unsafe methods of sharing sensitive
            information.
          </Text>
        </Container>

        <div className={classes.controls}>
          <Button
            className={classes.control}
            size={'lg'}
            onClick={() => router.push(DROP_PATH)}
          >
            Start a Drop
          </Button>
          <Button
            className={classes.control}
            variant={'light'}
            size={'lg'}
            onClick={() => scrollToId('start-grab-section')}
          >
            Grab a Secret
          </Button>
        </div>

        <Container size={460} px={0} mt={'lg'} w={'100%'}>
          <Divider
            label={'or install the CLI'}
            labelPosition={'center'}
            mb={'sm'}
          />
          <Box
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Code
              block
              style={{
                flex: 1,
                fontSize: theme.fontSizes.sm,
                padding: `${theme.spacing.sm} calc(${theme.spacing.xl} + ${theme.spacing.sm}) ${theme.spacing.sm} ${theme.spacing.sm}`,
                borderLeft: `2px solid ${theme.colors.blue[9]}a8`,
              }}
            >
              <span style={{ opacity: 0.5 }}>$ </span>
              {INSTALL_COMMAND}
            </Code>
            <CopyButton value={INSTALL_COMMAND} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip
                  label={copied ? 'Copied' : 'Copy'}
                  withArrow
                  position={'right'}
                >
                  <ActionIcon
                    variant={'subtle'}
                    color={copied ? 'teal' : 'gray'}
                    onClick={copy}
                    style={{
                      position: 'absolute',
                      right: theme.spacing.xs,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                    aria-label={'Copy install command'}
                  >
                    {copied ? (
                      <IconCheck size={16} />
                    ) : (
                      <IconCopy size={16} />
                    )}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Box>
        </Container>
      </div>

      <UnstyledButton
        className={classes.learnMore}
        onClick={() => scrollToId('features-section')}
        aria-label={'Learn more'}
      >
        <Text size={'sm'} fw={500}>
          Learn more
        </Text>
        <IconChevronDown size={20} className={classes.chevron} />
      </UnstyledButton>
    </div>
  );
}
