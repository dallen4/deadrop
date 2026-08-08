import type { ContainerProps } from '@mantine/core';
import type { ReactNode } from 'react';
import { MainWrapper as SharedMainWrapper } from '@shared/components';

// Desktop-specific default: every route (Home/Drop/Grab/Vault) wants the
// same `py="xl"` vertical padding, so bake it in here rather than making
// every caller repeat it — kept out of shared/'s MainWrapper since that's
// consumed cross-platform and shouldn't carry a desktop-only opinion.
export const MainWrapper = ({
  children,
  ...rest
}: { children: ReactNode } & ContainerProps) => (
  <SharedMainWrapper py={'xl'} {...rest}>
    {children}
  </SharedMainWrapper>
);
