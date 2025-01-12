import { AppRouteParts } from '../constants';
import { hono } from '../lib/http/core';
import { authenticated } from '../lib/middleware';

const authRouter = hono().get(
  AppRouteParts.CreateSignInToken,
  authenticated(),
  async (c) => {
    const userId = c.get('clerkAuth')!.userId!;

    const clerkClient = c.get('clerk');

    const { token } =
      await clerkClient.signInTokens.createSignInToken({
        userId,
        expiresInSeconds: 25,
      });

    return c.json({ token }, 200);
  },
);

export default authRouter;
