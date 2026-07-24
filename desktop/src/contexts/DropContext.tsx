import React, { createContext, useContext } from 'react';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons-react';
import { useDrop, type UseDropReturn } from '@shared/hooks/use-drop';
import { DEADROP_API_URL } from '../env';
import { useApiHeaders } from '../lib/api-headers';
import { initPeer } from '../lib/peer';
import { encryptFile, hashFile } from '../lib/crypto';

const DropContext = createContext<UseDropReturn<File>>(
  {} as UseDropReturn<File>,
);

export const useDropContext = () => useContext(DropContext);

export const DropProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const apiHeaders = useApiHeaders();

  const drop = useDrop<File>({
    apiUri: DEADROP_API_URL,
    apiHeaders,
    initPeer,
    file: { encrypt: encryptFile, hash: hashFile },
    onRetryExceeded: () =>
      showNotification({
        message: 'Connection may be unstable, please try again',
        color: 'red',
        icon: <IconX />,
        autoClose: 4500,
      }),
  });

  return (
    <DropContext.Provider value={drop}>{children}</DropContext.Provider>
  );
};
