import React from 'react';
import { ContainerProps, Container } from '@mantine/core';

export const MainWrapper = ({
  children,
  ...rest
}: {
  children: React.ReactNode;
} & ContainerProps) => {
  return (
    <Container
      maw={'700px'}
      mih={'calc(100vh - 225px)'}
      p={0}
      display={'flex'}
      {...rest}
      style={{
        flexDirection: 'column',
        ...rest.style,
      }}
    >
      {children}
    </Container>
  );
};
