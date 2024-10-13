import { PeerServerDO } from './lib/durable_objects';
import { cors, tracing } from './lib/middleware';
import { hono } from './lib/http/core';
import { AppRoutes } from './constants';
import peersRouter from './routers/peers';

const app = hono();

app.use(cors());
app.use(tracing());

app.get(AppRoutes.Root, (c) =>
  c.json({
    name: 'deadrop API',
    description:
      'A serverless API to handle drops and peer connection brokering',
    website: 'https://deadrop.io/',
  }),
);

app.route(AppRoutes.PeerJsRoot, peersRouter);

export default {
  fetch: app.fetch,
};

export { PeerServerDO };
