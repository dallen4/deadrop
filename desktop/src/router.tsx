import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { HomePage } from './routes/Home';
import { DropPage } from './routes/Drop';
import { GrabPage } from './routes/Grab';
import { SignInPage } from './routes/SignIn';
import { SignUpPage } from './routes/SignUp';
import { VaultPage } from './routes/Vault';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/drop', element: <DropPage /> },
      { path: '/grab', element: <GrabPage /> },
      { path: '/sign-in/*', element: <SignInPage /> },
      { path: '/sign-up/*', element: <SignUpPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: '/vault', element: <VaultPage /> }],
      },
    ],
  },
]);
