import React from 'react';
import {
  Container,
  Card,
  createStyles,
  Table,
  useMantineTheme,
} from '@mantine/core';
import { SectionTitle } from './SectionTitle';

type SupportStatus =
  | '✅ stable'
  | '📝 planned'
  | '🧪 experimental'
  | '🔐 limited access';

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
    cli: '🔐 limited access',
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

const useStyles = createStyles((theme) => ({
  featuresContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  card: {
    border: `1px solid light-dark(${theme.colors.gray[1]}, ${theme.colors.gray[5]})`,
  },
}));

export const FeaturesSupport = () => {
  const theme = useMantineTheme();
  const { classes } = useStyles();

  return (
    <Container
      size={'lg'}
      py={'xl'}
      px={0}
      mb={theme.spacing.xl * 2}
      display={'flex'}
      className={classes.featuresContainer}
    >
      <SectionTitle
        label={'Features Support'}
        id={'features-section'}
      />
      <Card maw={'600px'} className={classes.card}>
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
  );
};
