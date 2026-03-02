import React from 'react';
import GrabFlow from '~/organisms/GrabFlow';
import { Container } from '@mantine/core';
import { buildMeta } from '~/lib/meta';
import { GRAB_PATH } from '@shared/config/paths';

export function meta() {
  return buildMeta({
    title: 'Grab a Secret',
    description: 'Retrieve your securely shared encrypted secret',
    url: GRAB_PATH,
  });
}

export default function Grab() {
  return (
    <Container
      style={{ maxWidth: '700px', minHeight: 'calc(100vh - 202px)' }}
      p={0}
    >
      <GrabFlow />
    </Container>
  );
}