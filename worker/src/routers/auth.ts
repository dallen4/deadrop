import { getAuth } from '@hono/clerk-auth';
import { AppRoutes } from '../constants';
import { hono } from '../lib/http/core';
import { NotAuthenticated } from '../lib/messages';

const authRouter = hono().get(
  AppRoutes.CreateSignInToken,
  async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json(NotAuthenticated, 401);
    }

    const clerkClient = c.get('clerk');

    const { token } =
      await clerkClient.signInTokens.createSignInToken({
        userId: auth!.userId,
        expiresInSeconds: 25,
      });

    return c.json({ token }, 200);
  },
);

export default authRouter;
