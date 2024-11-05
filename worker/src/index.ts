import { requestId } from 'hono/request-id';
import { clerkMiddleware } from '@hono/clerk-auth';
import { AppRoutes } from './constants';
import { PeerServerDO } from './lib/durable_objects';
import { hono, Middleware } from './lib/http/core';
import { cors, redis } from './lib/middleware';
// import { dropRouter } from './routers/drop';
import peersRouter from './routers/peers';
import authRouter from './routers/auth';

const app = hono();

app.use(cors());
app.use(requestId());
app.use(clerkMiddleware() as Middleware);
app.use(redis());

app.get(AppRoutes.Root, (c) =>
  c.json({
    name: 'deadrop API',
    description:
      'A serverless API to handle drops and peer connection brokering',
    website: 'https://deadrop.io/',
  }),
);

app.route(AppRoutes.AuthRoot, authRouter);

app.route(AppRoutes.PeerJsRoot, peersRouter);

// app.route(AppRoutes.Drop, dropRouter);

export default {
  fetch: app.fetch,
};

export { PeerServerDO };
