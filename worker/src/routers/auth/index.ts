import { AppRouteParts } from '../../constants';
import { hono } from '../../lib/http/core';
import { authenticated } from '../../lib/middleware';
import apiKeysRouter from './apiKeys';

const authRouter = hono()
  .use(authenticated({ required: true }))
  .get(AppRouteParts.Me, async (c) => {
    const userId = c.get('userId')!;

    const {
      primaryEmailAddress: email,
      banned,
      locked,
      publicMetadata: metadata,
      createdAt,
      lastActiveAt,
    } = await c.var.clerk.users.getUser(userId);

    return c.json(
      {
        id: userId,
        email,
        banned,
        locked,
        metadata,
        lastActiveAt: new Date(lastActiveAt!),
        createdAt: new Date(createdAt),
      },
      200,
    );
  })
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
