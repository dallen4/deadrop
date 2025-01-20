import React, { useRef } from 'react';
import {
  Button,
  Card,
  Center,
  Group,
  Text,
  TextInput,
  Title,
  createStyles,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { GRAB_PATH, OVERVIEW_DOCS_PATH } from '@shared/config/paths';
import { HeroBanner } from 'molecules/HeroBanner';
import { Faq, Features } from 'molecules/sections';
import { FeaturesSupport } from 'molecules/sections/FeaturesSupport';
import { Tools } from 'molecules/sections/Tools';
import { useRouter } from 'next/router';

const useStyles = createStyles((theme) => ({
  control: {
    height: 42,
    fontSize: theme.fontSizes.md,

    '&:not(:first-child)': {
      marginLeft: theme.spacing.md,
    },

    '@media (max-width: 520px)': {
      '&:not(:first-child)': {
        marginTop: theme.spacing.md,
        marginLeft: 0,
      },
    },
  },
}));

const Home = () => {
  const router = useRouter();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${theme.breakpoints.sm}px)`,
  );
  const inputRef = useRef<HTMLInputElement>();
  const { classes } = useStyles();

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

    router.push(`${GRAB_PATH}?${params}`);
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
      <FeaturesSupport />
      <Center>
        <Button
          className={classes.control}
          size={'lg'}
          onClick={() => router.push(OVERVIEW_DOCS_PATH)}
        >
          Check out the Docs
        </Button>
      </Center>
      {/* <Premium /> */}
    </>
  );
};

export default Home;
