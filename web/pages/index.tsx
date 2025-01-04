import React, { useRef } from 'react';
import { HeroBanner } from 'molecules/HeroBanner';
import {
  Title,
  Text,
  TextInput,
  Card,
  Center,
  useMantineTheme,
  Button,
  Group,
  createStyles,
  Container,
  Table,
} from '@mantine/core';
import { Features, Faq } from 'molecules/sections';
import { useRouter } from 'next/router';
import { GRAB_PATH, OVERVIEW_DOCS_PATH } from '@shared/config/paths';
import { useMediaQuery } from '@mantine/hooks';
import { Tools } from 'molecules/sections/Tools';
import { SectionTitle } from 'molecules/sections/SectionTitle';

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

type SupportStatus = '✅ stable' | '📝 planned' | '🧪 experimental';
type FeatureEntry = {
  name: string;
  web: SupportStatus;
  cli: SupportStatus;
  vscode: SupportStatus;
};

const items: Array<FeatureEntry> = [
  {
    name: 'drop string',
    web: '✅ stable',
    cli: '✅ stable',
    vscode: '📝 planned',
  },
  {
    name: 'drop file',
    web: '✅ stable',
    cli: '✅ stable',
    vscode: '📝 planned',
  },
  {
    name: 'grab string',
    web: '✅ stable',
    cli: '✅ stable',
    vscode: '📝 planned',
  },
  {
    name: 'grab file',
    web: '✅ stable',
    cli: '✅ stable',
    vscode: '📝 planned',
  },
  {
    name: 'local vaults',
    web: '📝 planned',
    cli: '🧪 experimental',
    vscode: '📝 planned',
  },
  {
    name: 'cloud vaults',
    web: '📝 planned',
    cli: '📝 planned',
    vscode: '📝 planned',
  },
];

const FeatureRow = ({ item }: { item: FeatureEntry }) => {
  return (
    <tr key={item.name}>
      <td>{item.name}</td>
      <td>{item.web}</td>
      <td>{item.cli}</td>
      {/* <td>{item.vscode}</td> */}
    </tr>
  );
};

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
      <Container
        size={'lg'}
        py={'md'}
        px={0}
        mb={theme.spacing.xl * 2}
      >
        <SectionTitle
          label={'Features Support'}
          id={'features-section'}
        />
        <Card maw={'650px'}>
          <Table fontSize={'lg'}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Web Application</th>
                <th>CLI</th>
                {/* <th>VSCode Extension</th> */}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <FeatureRow key={index} item={item} />
              ))}
            </tbody>
          </Table>
        </Card>
      </Container>
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
