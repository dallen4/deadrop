import { PeerServerDO } from './lib/durable_objects';
import { cors, tracing } from './lib/middleware';
import { hono } from './lib/http/core';
import { PeerJsRoutes } from './constants';

const WELCOME_TEXT = JSON.stringify({
  name: 'PeerJS Server',
  description:
    'A server side element to broker connections between PeerJS clients.',
  website: 'https://peerjs.com/',
});

const app = hono();

app.use(cors());
app.use(tracing());

app.get(PeerJsRoutes.Index, (c) => c.text(WELCOME_TEXT));

app.get(PeerJsRoutes.PeerJs, (c) => {
  const url = new URL(c.req.url);

  const objId = c.env.PEER_SERVER.idFromName(url.host);
  const stub = c.env.PEER_SERVER.get(objId);

  return stub.fetch(c.req.raw);
});

app.get(PeerJsRoutes.GenerateId, (c) => c.text(crypto.randomUUID()));

export default {
  fetch: app.fetch,
};

export { PeerServerDO };
