import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

// the worker lives on a separate origin from web, so it can't rely on
// the Clerk session cookie - every API-calling hook should source its
// auth header from here instead of reaching for getToken() itself
export const useApiHeaders = () => {
  const { getToken } = useAuth();

  return useCallback(async () => {
    const token = await getToken();
    const headers: Record<string, string> = {};

    if (token) headers.Authorization = `Bearer ${token}`;

    return headers;
  }, [getToken]);
};
