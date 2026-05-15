import React from 'react';
import { Container, Card, Table, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { SectionTitle } from './SectionTitle';
import classes from './FeaturesSupport.module.css';

type SupportStatus =
  | '✅ stable'
  | '🧪 alpha'
  | '🔐 limited access'
  | '🛠️ in development'
  | '📝 planned';

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
    vscode: '🧪 alpha',
  },
  {
    name: 'drop file',
    web: '✅ stable',
    cli: '✅ stable',
    vscode: '🛠️ in development',
  },
  {
    name: 'grab string',
    web: '✅ stable',
    cli: '✅ stable',
    vscode: '🧪 alpha',
  },
  {
    name: 'grab file',
    web: '✅ stable',
    cli: '✅ stable',
    vscode: '🛠️ in development',
  },
  {
    name: 'local vaults',
    web: '🧪 alpha',
    cli: '✅ stable',
    vscode: '🧪 alpha',
  },
  {
    name: 'cloud vaults',
    web: '📝 planned',
    cli: '🧪 alpha',
    vscode: '🛠️ in development',
  },
];

const statusEmoji = (s: SupportStatus) => s.split(' ')[0];
const statusLabel = (s: SupportStatus) =>
  s.split(' ').slice(1).join(' ');

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
      <td className={classes.cell} style={{ padding: '16px 28px' }}>
        {item.name}
      </td>
      <StatusCell status={item.web} compact={compact} />
      <StatusCell status={item.cli} compact={compact} />
      <StatusCell status={item.vscode} compact={compact} />
    </tr>
  );
};

export const FeaturesSupport = () => {
  const compact = useMediaQuery('(max-width: 600px)') ?? false;

  return (
    <Container
      size={'lg'}
      py={'xl'}
      px={0}
      display={'flex'}
      className={classes.featuresContainer}
    >
      <SectionTitle
        label={'Features Support'}
        id={'features-section'}
      />
      <Card maw={'700px'} className={classes.card} p={0}>
        <Table fz={'lg'} className={classes.featureTable}>
          <colgroup>
            <col style={{ width: '28%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '24%' }} />
          </colgroup>
          <thead>
            <tr>
              <th
                className={classes.cell}
                style={{ padding: '16px 28px', textAlign: 'left' }}
              >
                Feature
              </th>
              <th
                className={classes.cell}
                style={{
                  padding: '16px 28px',
                  textAlign: compact ? 'center' : 'left',
                }}
              >
                Web
              </th>
              <th
                className={classes.cell}
                style={{
                  padding: '16px 28px',
                  textAlign: compact ? 'center' : 'left',
                }}
              >
                CLI
              </th>
              <th
                className={classes.cell}
                style={{
                  padding: '16px 28px',
                  textAlign: compact ? 'center' : 'left',
                }}
              >
                VSCode
              </th>
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
