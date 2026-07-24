import React, { createContext, useContext } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons-react';
import { useGrab, type UseGrabReturn } from '@shared/hooks/use-grab';
import { DEADROP_API_URL } from '../env';
import { useApiHeaders } from '../lib/api-headers';
import { initPeer } from '../lib/peer';
import { decryptFile, hashFile } from '../lib/crypto';

const GrabContext = createContext<UseGrabReturn<File>>(
  {} as UseGrabReturn<File>,
);

export const useGrabContext = () => useContext(GrabContext);

export const GrabProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const apiHeaders = useApiHeaders();

  const grab = useGrab<File>({
    apiUri: DEADROP_API_URL,
    apiHeaders,
    initPeer,
    file: { decrypt: decryptFile, hash: hashFile },
    onRetryExceeded: () =>
      showNotification({
        message: 'Connection may be unstable, please try again',
        color: 'red',
        icon: <IconX />,
        autoClose: 4500,
      }),
  });

  return (
    <GrabContext.Provider value={grab}>{children}</GrabContext.Provider>
  );
};
