import { useAuth } from '@clerk/react';
import { DropFlow } from '@shared/components';
import { MainWrapper } from '../components/MainWrapper';
import { DropState } from '@shared/lib/constants';
import { DropProvider, useDropContext } from '../contexts/DropContext';
import { isExperimental } from '../lib/billing';
import { generateGrabUrl } from '../lib/util';
import { usePeerSessionGuard } from '../lib/session-guard';

const DropInner = () => {
  const drop = useDropContext();
  const { sessionClaims } = useAuth();

  usePeerSessionGuard(
    [DropState.Ready, DropState.Accepting].includes(drop.status),
  );

  return (
    <DropFlow
      drop={drop}
      experimental={isExperimental(sessionClaims)}
      generateGrabUrl={generateGrabUrl}
    />
  );
};

export const DropPage = () => (
  <MainWrapper>
    <DropProvider>
      <DropInner />
    </DropProvider>
  </MainWrapper>
);
