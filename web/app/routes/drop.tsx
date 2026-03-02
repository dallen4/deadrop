import React from 'react';
import DropFlow from '~/organisms/DropFlow';
import { Container } from '@mantine/core';
import { buildMeta } from '~/lib/meta';
import { DROP_PATH } from '@shared/config/paths';

export function meta() {
  return buildMeta({
    title: 'Create a Drop',
    description: 'Securely share encrypted secrets with end-to-end encryption',
    url: DROP_PATH,
  });
}

export default function Drop() {
  return (
    <Container
      style={{ maxWidth: '700px', minHeight: 'calc(100vh - 202px)' }}
      p={0}
    >
      <DropFlow />
    </Container>
  );
}