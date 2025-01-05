import { getCookie } from 'hono/cookie';
import { DropDetails } from '@shared/types/common';
import { AppRouteParts } from '../constants';
import { hono } from '../lib/http/core';
import { formatDropKey } from '@shared/lib/util';
import { createCacheHandlers } from '../lib/cache';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SessionNotFound } from '../lib/messages';
import { TEST_TOKEN_COOKIE, testTokenKey } from '@shared/tests/http';

const dropIdSchema = z.object({ id: z.string() });

const dropRouter = hono()
  .post(
    AppRouteParts.Root,
    zValidator('json', dropIdSchema),
    async (c) => {
      const ipAddress = c.get('ipAddress');

      const testToken = getCookie(c, TEST_TOKEN_COOKIE);

      const { createDrop, checkAndIncrementUserDropCount } =
        createCacheHandlers(c);

      const verifyTestToken = async (token: string) => {
        const fetchedToken = await c
          .get('redis')
          .get<string>(testTokenKey);

        return fetchedToken ? fetchedToken === token : false;
      };

      const canDrop = testToken
        ? await verifyTestToken(testToken)
        : await checkAndIncrementUserDropCount(ipAddress!);

      if (!canDrop)
        return c.json({ message: 'Daily drop limit reached' }, 500);

      const { id: peerId } = c.req.valid('json');

      const { dropId, nonce } = await createDrop(peerId, !!testToken);

      return c.json(
        {
          id: dropId,
          nonce,
        },
        200,
      );
    },
  )
  .get(
    AppRouteParts.Root,
    zValidator('query', dropIdSchema),
    async (c) => {
      const { id: dropId } = c.req.valid('query');

      if (!dropId) return c.json(SessionNotFound, 404);

      const redis = c.get('redis');

      // get drop
      const dropKey = formatDropKey(dropId);
      const dropDetails = await redis.hgetall<DropDetails>(dropKey);

      if (!dropDetails) return c.json(SessionNotFound, 404);

      return c.json(dropDetails, 200);
    },
  )
  .delete(
    AppRouteParts.Root,
    zValidator('json', dropIdSchema),
    async (c) => {
      const { id: dropId } = c.req.valid('json');

      const redis = c.get('redis');

      const dropKey = formatDropKey(dropId);

      // delete drop
      const dropsDeleted = await redis.del(dropKey);

      const success = dropsDeleted === 1;

      return c.json({ success }, success ? 200 : 500);
    },
  );

export default dropRouter;
