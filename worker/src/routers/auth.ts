import { getAuth } from '@hono/clerk-auth';
import { AppRoutes } from '../constants';
import { hono } from '../lib/http/core';

const authRouter = hono();

authRouter.get(AppRoutes.CreateSignInToken, async (c) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    return c.json({
      message: 'Not authenticated!',
    });
  }

  const clerkClient = c.get('clerk');

  const { token } = await clerkClient.signInTokens.createSignInToken({
    userId: auth!.userId,
    expiresInSeconds: 25,
  });

  return c.json({ token });
});

export default authRouter;
