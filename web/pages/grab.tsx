import React from 'react';
import { MainWrapper } from 'atoms/MainWrapper';
import { GrabProvider } from 'contexts/GrabContext';
import { GrabFlow } from 'organisms/GrabFlow';

const Grab = () => {
  return (
    <MainWrapper>
      <GrabProvider>
        <GrabFlow />
      </GrabProvider>
    </MainWrapper>
  );
};

export default Grab;
