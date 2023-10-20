import { handleAuth, initAuth0 } from '@auth0/nextjs-auth0';

if (!process.env.AUTH0_BASE_URL)
    process.env.AUTH0_BASE_URL = process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL!;

export default handleAuth();
