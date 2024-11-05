import { AppRoutes } from '../constants';
import { hono } from '../lib/http/core';

const peersRouter = hono()
  .get(AppRoutes.Root, (c) => {
    const url = new URL(c.req.url);

    const objId = c.env.PEER_SERVER.idFromName(url.host);
    const stub = c.env.PEER_SERVER.get(objId);

    return stub.fetch(c.req.raw);
  })
  .get(AppRoutes.GenerateId, (c) => c.text(crypto.randomUUID()));

export default peersRouter;
