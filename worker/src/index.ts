import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { AppRoutes } from './constants';
import { PeerServerDO } from './lib/durable_objects';
import { hono, Middleware } from './lib/http/core';
import { cors, tracing } from './lib/middleware';
import { dropRouter } from './routers/drop';
import peersRouter from './routers/peers';

const app = hono();

app.use(cors());
app.use(tracing());
app.use(clerkMiddleware() as unknown as Middleware);

app.get(AppRoutes.Root, (c) =>
  c.json({
    name: 'deadrop API',
    description:
      'A serverless API to handle drops and peer connection brokering',
    website: 'https://deadrop.io/',
  }),
);

app.get('/auth/token', async (c) => {
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

app.route(AppRoutes.PeerJsRoot, peersRouter);

app.route(AppRoutes.Drop, dropRouter);

export default {
  fetch: app.fetch,
};

export { PeerServerDO };
