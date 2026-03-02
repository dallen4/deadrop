import React, { useRef } from 'react';
import { useNavigate } from 'react-router';
import { HeroBanner } from '~/molecules/HeroBanner';
import {
  Title,
  Text,
  TextInput,
  Card,
  Center,
  useMantineTheme,
  Button,
  Group,
} from '@mantine/core';
import { Features, Faq } from '~/molecules/sections';
import { GRAB_PATH, HOME_PATH, OVERVIEW_DOCS_PATH } from '@shared/config/paths';
import { useMediaQuery } from '@mantine/hooks';
import { Tools } from '~/molecules/sections/Tools';
import { ComingSoon } from '~/molecules/sections/ComingSoon';
import { buildMeta } from '~/lib/meta';
import classes from '~/app/index.module.css';

export function meta() {
  return buildMeta({
    title: 'deadrop',
    description: 'e2e encrypted secret sharing',
    url: HOME_PATH,
  });
}

export default function Index() {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${theme.breakpoints.sm}px)`,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const submitGrab = () => {
    const inputVal = inputRef.current!.value;

    const isUrl = inputVal.includes(
      window.location.protocol + window.location.host,
    );

    const params = isUrl
      ? inputVal.split('?')[1]
      : new URLSearchParams({
          drop: inputRef.current!.value,
        }).toString();

    navigate(`${GRAB_PATH}?${params}`);
  };

  return (
    <>
      <HeroBanner />
      <Features />
      <Center
        style={{
          minHeight: '230px',
          paddingTop: theme.spacing.xl,
          paddingBottom: theme.spacing.md,
        }}
      >
        <Card
          id={'start-grab-section'}
          withBorder
          shadow={'sm'}
          style={{
            width: '90%',
            maxWidth: '500px',
            padding: theme.spacing.xl,
          }}
        >
          <Title size={'h2'}>Grab a Secret</Title>
          <Text size={'sm'} style={{ paddingTop: 2 }}>
            Enter your drop ID (or link) that was shared with you!
          </Text>
          <Group style={{ paddingTop: theme.spacing.md }}>
            <TextInput
              ref={inputRef as any}
              styles={{
                root: isMobile
                  ? {
                      width: '100%',
                    }
                  : undefined,
              }}
              size={'md'}
              variant={'filled'}
              placeholder={'sUp3Rs3c3R+'}
            />
            <Button
              size={'md'}
              fullWidth={isMobile}
              onClick={submitGrab}
            >
              Start
            </Button>
          </Group>
        </Card>
      </Center>
      <Faq />
      <Tools />
      <ComingSoon />
      <Center>
        <Button
          className={classes.control}
          size={'lg'}
          onClick={() => navigate(OVERVIEW_DOCS_PATH)}
        >
          Check out the Docs
        </Button>
      </Center>
      {/* <Premium /> */}
    </>
  );
}
