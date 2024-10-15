import React from 'react';
import DropFlow from 'organisms/DropFlow';
import { Container } from '@mantine/core';

const Drop = () => {
  return (
    <Container
      style={{ maxWidth: '700px', minHeight: 'calc(100vh - 202px)' }}
      p={0}
    >
      <DropFlow />
    </Container>
  );
};

export default Drop;
