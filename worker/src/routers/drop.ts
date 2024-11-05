import { getCookie } from 'hono/cookie';
import { DropDetails } from '@shared/types/common';
import { AppRoutes } from '../constants';
import { hono } from '../lib/http/core';
import { formatDropKey } from '@shared/lib/util';
import { DISABLE_CAPTCHA_COOKIE } from '@shared/config/http';
import { createCacheHandlers } from '../lib/cache';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SessionNotFound } from '../lib/messages';

const dropIdSchema = z.object({ id: z.string() });

const dropRouter = hono()
  .post(
    AppRoutes.Root,
    zValidator('json', dropIdSchema),
    async (c) => {
      const ipAddress = c.get('ipAddress');

      const disableCaptchaCookie = getCookie(
        c,
        DISABLE_CAPTCHA_COOKIE,
      )
        ? true
        : false;

      const { createDrop, checkAndIncrementUserDropCount } =
        createCacheHandlers(c);

      const canDrop = disableCaptchaCookie
        ? true
        : await checkAndIncrementUserDropCount(ipAddress!);

      if (!canDrop)
        return c.json({ message: 'Daily drop limit reached' }, 500);

      const { id: peerId } = c.req.valid('json');

      const { dropId, nonce } = await createDrop(
        peerId,
        disableCaptchaCookie,
      );

      c.json(
        {
          id: dropId,
          nonce,
        },
        200,
      );
    },
  )
  .get(
    AppRoutes.Root,
    zValidator('query', dropIdSchema),
    async (c) => {
      const { id: dropId } = c.req.valid('query');

      if (!dropId) return c.json(SessionNotFound, 404);

      const redis = c.get('redis');

      // get drop
      const dropKey = formatDropKey(dropId);
      const dropDetails = await redis.get<DropDetails>(dropKey);

      if (!dropDetails) return c.json(SessionNotFound, 404);

      return c.json(dropDetails, 200);
    },
  )
  .delete(
    AppRoutes.Root,
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
