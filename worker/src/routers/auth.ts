import { getAuth } from '@hono/clerk-auth';
import { AppRoutes } from '../constants';
import { hono } from '../lib/http/core';

const authRouter = hono();

authRouter.get(AppRoutes.CreateSignInToken, async (c) => {
  const user = getAuth(c);

  if (!user?.userId)
    return c.json({
      message: 'You are not logged in.',
    });

  const clerkClient = c.get('clerk');

  const ticket = await clerkClient.signInTokens.createSignInToken({
    userId: user.userId,
    expiresInSeconds: 20,
  });

  return c.json({ token: ticket.token });
});
