import React from 'react';
import {
  Container,
  Card,
  Table,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { SectionTitle } from './SectionTitle';
import classes from './FeaturesSupport.module.css';

type SupportStatus =
  | '✅ stable'
  | '📝 planned'
  | '🧪 alpha'
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
    web: '🧪 alpha',
    cli: '✅ stable',
    vscode: '📝 planned',
  },
  {
    name: 'cloud vaults',
    web: '📝 planned',
    cli: '🧪 alpha',
    vscode: '📝 planned',
  },
];

const statusEmoji = (s: SupportStatus) => s.split(' ')[0];
const statusLabel = (s: SupportStatus) => s.split(' ').slice(1).join(' ');

const StatusCell = ({
  status,
  compact,
}: {
  status: SupportStatus;
  compact: boolean;
}) => {
  const content = compact ? (
    <Tooltip label={statusLabel(status)} withArrow position={'top'}>
      <span style={{ cursor: 'default' }}>{statusEmoji(status)}</span>
    </Tooltip>
  ) : (
    status
  );

  return (
    <td
      className={classes.cell}
      style={{
        padding: '16px 28px',
        textAlign: compact ? 'center' : undefined,
      }}
    >
      {content}
    </td>
  );
};

const FeatureRow = ({
  item,
  compact,
}: {
  item: FeatureEntry;
  compact: boolean;
}) => {
  return (
    <tr key={item.name} className={classes.row}>
      <td className={classes.cell} style={{ padding: '16px 28px' }}>{item.name}</td>
      <StatusCell status={item.web} compact={compact} />
      <StatusCell status={item.cli} compact={compact} />
      <StatusCell status={item.vscode} compact={compact} />
    </tr>
  );
};

export const FeaturesSupport = () => {
  const theme = useMantineTheme();
  const compact = useMediaQuery('(max-width: 600px)') ?? false;

  return (
    <Container
      size={'lg'}
      pt={'md'}
      pb={'xl'}
      px={0}
      mb={theme.spacing.xl}
      display={'flex'}
      className={classes.featuresContainer}
    >
      <SectionTitle
        label={'Features Support'}
        id={'features-section'}
      />
      <Card maw={'750px'} className={classes.card} p={0}>
        <Table fz={'lg'} className={classes.featureTable}>
          <colgroup>
            <col style={{ width: '31%' }} />
            <col style={{ width: '23%' }} />
            <col style={{ width: '23%' }} />
            <col style={{ width: '23%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className={classes.cell} style={{ padding: '16px 28px', textAlign: 'left' }}>Feature</th>
              <th className={classes.cell} style={{ padding: '16px 28px', textAlign: compact ? 'center' : 'left' }}>Web</th>
              <th className={classes.cell} style={{ padding: '16px 28px', textAlign: compact ? 'center' : 'left' }}>CLI</th>
              <th className={classes.cell} style={{ padding: '16px 28px', textAlign: compact ? 'center' : 'left' }}>VSCode</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <FeatureRow key={index} item={item} compact={compact} />
            ))}
          </tbody>
        </Table>
      </Card>
    </Container>
  );
};
