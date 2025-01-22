import React from 'react';
import { MainWrapper } from 'atoms/MainWrapper';
import { DropProvider } from 'contexts/DropContext';
import { DropFlow } from 'organisms/DropFlow';

const Drop = () => {
  return (
    <MainWrapper>
      <DropProvider>
        <DropFlow />
      </DropProvider>
    </MainWrapper>
  );
};

export default Drop;
