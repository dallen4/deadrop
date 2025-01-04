import { clerkMiddleware } from '@hono/clerk-auth';
import { requestId } from 'hono/request-id';
import { AppRoutes } from './constants';
import { hono, Middleware } from './lib/http/core';
import { cors, redis, tracing } from './lib/middleware';
import authRouter from './routers/auth';
import peersRouter from './routers/peers';
import dropRouter from './routers/drop';
import vaultRouter from './routers/vault';

const api = hono();

api.use(cors());
api.use(tracing());
api.use(requestId());
api.use(clerkMiddleware() as Middleware);
api.use(redis());

export const app = api
  .get(AppRoutes.Root, (c) =>
    c.json({
      name: 'deadrop API',
      description:
        'A serverless API to handle drops and peer connection brokering',
      website: 'https://deadrop.io/',
    }),
  )
  .route(AppRoutes.AuthRoot, authRouter)
  .route(AppRoutes.PeerJsRoot, peersRouter)
  .route(AppRoutes.Drop, dropRouter)
  .route(AppRoutes.VaultRoot, vaultRouter);

export type DeadropWorkerApi = typeof app;
