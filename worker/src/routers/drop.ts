import { getCookie } from 'hono/cookie';
import { getAuth } from '@hono/clerk-auth';
import { DropDetails } from '@shared/types/common';
import { AppRouteParts } from '../constants';
import { hono } from '../lib/http/core';
import { formatDropKey } from '@shared/lib/util';
import { createCacheHandlers } from '../lib/cache';
import { checkMaxGrabbers } from '../lib/billing';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SessionNotFound, PermissionDenied } from '../lib/messages';
import {
  TEST_TOKEN_COOKIE,
  TEST_TOKEN_HEADER,
  testTokenKey,
} from '@shared/tests/http';

const dropIdSchema = z.object({ id: z.string() });

const createDropSchema = z.object({
  id: z.string(),
  maxGrabbers: z.number().int().positive().optional(),
});

const dropRouter = hono()
  .post(
    AppRouteParts.Root,
    zValidator('json', createDropSchema),
    async (c) => {
      const ipAddress = c.get('ipAddress');

      // fallback to the test token header
      const testToken =
        getCookie(c, TEST_TOKEN_COOKIE) ??
        c.req.header(TEST_TOKEN_HEADER);

      const {
        createDrop,
        checkAndIncrementUserDropCount,
        checkAndIncrementAuthUserDropCount,
      } = createCacheHandlers(c);

      const { id: peerId, maxGrabbers: requestedMaxGrabbers } =
        c.req.valid('json');

      const verifyTestToken = async (token: string) => {
        const fetchedToken = await c
          .get('redis')
          .get<string>(testTokenKey);

        return fetchedToken ? fetchedToken === token : false;
      };

      // a valid CI test token acts as the experimental bypass (same as
      // the captcha / drop-count bypass) so multidrop caps can be
      // exercised end-to-end without a Clerk session
      const isTestSession = testToken
        ? await verifyTestToken(testToken)
        : false;

      if (
        requestedMaxGrabbers &&
        requestedMaxGrabbers > 1 &&
        !isTestSession
      ) {
        const claims = getAuth(c)?.sessionClaims;

        const { allowed } = checkMaxGrabbers(
          requestedMaxGrabbers,
          claims,
        );

        if (!allowed) return c.json(PermissionDenied, 403);
      }

      const canDrop = isTestSession
        ? true
        : await checkAndIncrementUserDropCount(ipAddress!);

      if (!canDrop)
        return c.json({ message: 'Daily drop limit reached' }, 500);

      const { dropId, nonce } = await createDrop(
        peerId,
        requestedMaxGrabbers ?? 1,
        !!testToken,
      );

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

      // lazy-default drops created before maxGrabbers existed
      return c.json(
        { ...dropDetails, maxGrabbers: dropDetails.maxGrabbers ?? 1 },
        200,
      );
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
