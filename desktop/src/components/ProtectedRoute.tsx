import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { Center, Loader } from '@mantine/core';

// Guards signed-in-only surfaces. Drop/grab are anonymous, so this is not
// wired to any route yet — it's here for vault/account features (follow-up).
export const ProtectedRoute = () => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded)
    return (
      <Center mih={'50vh'}>
        <Loader />
      </Center>
    );

  if (!isSignedIn) return <Navigate to={'/sign-in'} replace />;

  return <Outlet />;
};
