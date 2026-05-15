import React from 'react';
import { Container, Text } from '@mantine/core';
import {
  IconLock,
  IconKey,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';

import classes from './Features.module.css';

type FeatureDef = {
  icon: Icon;
  title: string;
  description: string;
  position: 'apex' | 'bottomLeft' | 'bottomRight';
};

const features: FeatureDef[] = [
  {
    icon: IconLock,
    title: 'End-to-end encryption',
    description: `Your secrets are encrypted on device & can only be decrypted when received.`,
    position: 'apex',
  },
  {
    icon: IconKey,
    title: 'Ephemeral credentials',
    description:
      'None of the key pairs, nonces, or secret metadata are stored on-disk and are destroyed when the drop is complete.',
    position: 'bottomLeft',
  },
  {
    icon: IconUsers,
    title: 'Peer-to-peer handoff',
    description: `Secrets are never handled by a server and are sent directly to the receiving user's device via WebRTC.`,
    position: 'bottomRight',
  },
];

function Feature({
  icon: Icon,
  title,
  description,
  position,
}: FeatureDef) {
  return (
    <div className={`${classes.feature} ${classes[position]}`}>
      <div className={classes.iconWrap}>
        <Icon size={32} stroke={1.75} />
      </div>
      <Text fw={700} size="lg" mb="xs" className={classes.title}>
        {title}
      </Text>
      <Text c="dimmed" size="sm" className={classes.description}>
        {description}
      </Text>
    </div>
  );
}

export function Features() {
  return (
    <Container pt={0} pb="xl" size="lg" className={classes.wrapper}>
      <div className={classes.triangle}>
        {features.map((f) => (
          <Feature key={f.title} {...f} />
        ))}
      </div>
    </Container>
  );
}
