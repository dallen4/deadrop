import React from 'react';
import {
  Button,
  Container,
  Divider,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { DROP_PATH } from '@shared/config/paths';
import { TypeAnimation } from 'react-type-animation';
import { CopyableCode } from 'atoms/Code';

// based off of: https://ui.mantine.dev/category/hero

import classes from './HeroBanner.module.css';

export const INSTALL_COMMAND =
  'curl -fsSL https://deadrop.io/install.sh | sh';

export function HeroBanner() {
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
          <CopyableCode
            value={INSTALL_COMMAND}
            ariaLabel={'Copy install command'}
          />
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
