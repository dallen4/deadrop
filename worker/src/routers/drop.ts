import { AppRoutes } from '../constants';
import { hono } from '../lib/http/core';

const dropRouter = hono();

const SessionNotFound = {
  error: 'Session not found',
};

dropRouter.post(AppRoutes.Root, async (c) => {
  const ipAddress = c.get('ipAddress');

  const { id: peerId } = await c.req.json<{ id: string }>();
});

dropRouter.get(AppRoutes.Root, async (c) => {
  const dropId = c.req.query('id');

  if (!dropId) return c.json(SessionNotFound, 404);

  // get drop

  return c.json({}, 200);
});

dropRouter.delete(AppRoutes.Root, async (c) => {
  const ipAddress = c.get('ipAddress');

  const { id: peerId } = await c.req.json<{ id: string }>();

  // delete drop

  return c.json({ success: true }, 200);
});

export { dropRouter };
