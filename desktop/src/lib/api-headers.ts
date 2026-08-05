import { useCallback } from 'react';
import { useAuth } from '@clerk/react';

// The worker lives cross-origin from this app, so session cookies never
// transmit — every API call sources its bearer token here instead. Identity
// is attached opportunistically (drop/grab also work anonymously).
export const useApiHeaders = () => {
  const { getToken } = useAuth();

  return useCallback(async () => {
    const token = await getToken();
    const headers: Record<string, string> = {};

    if (token) headers.Authorization = `Bearer ${token}`;

    return headers;
  }, [getToken]);
};
