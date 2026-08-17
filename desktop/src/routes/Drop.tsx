import { useAuth } from '@clerk/react';
import { useLocation } from 'react-router-dom';
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
  // Set by the vault page when sharing a vault.
  const { staged } = (useLocation().state ?? {}) as {
    staged?: { summary: string; payload: string };
  };

  usePeerSessionGuard(
    [DropState.Ready, DropState.Accepting].includes(drop.status),
  );

  return (
    <DropFlow
      drop={drop}
      experimental={isExperimental(sessionClaims)}
      generateGrabUrl={generateGrabUrl}
      staged={staged}
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
