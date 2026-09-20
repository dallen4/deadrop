import { AppRouteParts } from '../constants';
import { hono } from '../lib/http/core';
import { authenticated } from '../lib/middleware';
import apiKeysRouter from './auth/apiKeys';

const authRouter = hono()
  .use(authenticated())
  .get(AppRouteParts.Me)
  .get(AppRouteParts.CreateSignInToken, async (c) => {
    const userId = c.get('userId')!;

    const { token } =
      await c.var.clerk.signInTokens.createSignInToken({
        userId,
        expiresInSeconds: 60,
      });

    return c.json({ token }, 200);
  })
  .route(AppRouteParts.ApiKeys, apiKeysRouter);

export default authRouter;
