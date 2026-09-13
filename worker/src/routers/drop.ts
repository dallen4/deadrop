import { getCookie } from 'hono/cookie';
import { getAuth } from '@clerk/hono';
import { DropDetails } from '@shared/types/common';
import { AppRouteParts } from '../constants';
import { hono } from '../lib/http/core';
import { formatDropKey } from '@shared/lib/kv';
import { createCacheHandlers } from '../lib/cache';
import { checkMaxGrabbers, getPlanLimits } from '../lib/billing';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  SessionNotFound,
  PermissionDenied,
  TurnCredentialsUnavailable,
} from '../lib/messages';
import {
  TEST_TOKEN_COOKIE,
  TEST_TOKEN_HEADER,
  testTokenKey,
} from '@shared/tests/http';
import { generateTurnCredentials } from '../lib/http/turn';
import { Context } from 'hono';
import { HonoCtx } from '../lib/http/core';

const dropIdSchema = z.object({ id: z.string() });

// A drop with no relay credentials can silently fail to connect for any
// grabber behind a restrictive NAT, so a mint failure has to fail the
// request loudly rather than hand back a drop that half-works.
const mintTurnCreds = async (c: Context<HonoCtx>) => {
  try {
    return await generateTurnCredentials({
      turnKeyId: c.env.TURN_KEY_ID,
      turnKeyApiToken: c.env.TURN_KEY_API_TOKEN,
    });
  } catch (err) {
    console.error('Failed to mint TURN credentials', err);
    return null;
  }
};

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

      // Annotated because `web` typechecks this file without
      // @cloudflare/workers-types, where KVNamespace resolves to unknown.
      const tokenEntry: string | null =
        await c.env.DROP_STORE.get(testTokenKey, 'text');

      // a valid CI test token acts as the experimental bypass (same as
      // the captcha / drop-count bypass) so multidrop caps can be
      // exercised end-to-end without a Clerk session
      const isTestSession = !!tokenEntry && tokenEntry === testToken;

      const claims = getAuth(c)?.sessionClaims;

      if (
        requestedMaxGrabbers &&
        requestedMaxGrabbers > 1 &&
        !isTestSession
      ) {
        const { allowed } = checkMaxGrabbers(
          requestedMaxGrabbers,
          claims,
        );

        if (!allowed) return c.json(PermissionDenied, 403);
      }

      if (!isTestSession) {
        const userId = c.get('userId');

        // Anonymous callers have no claims, so getPlanLimits resolves
        // them to the free tier rather than a separate env-var limit.
        const { dailyDrops } = getPlanLimits(claims);

        const canDrop = !!userId
          ? await checkAndIncrementAuthUserDropCount(
              userId,
              dailyDrops,
            )
          : await checkAndIncrementUserDropCount(
              ipAddress!,
              dailyDrops,
            );

        // 429, not 500: a quota denial must be distinguishable from a
        // server fault, or clients retry a limit they cannot clear.
        if (!canDrop)
          return c.json({ message: 'Daily drop limit reached' }, 429);
      }

      const { dropId, nonce } = await createDrop(
        peerId,
        requestedMaxGrabbers ?? 1,
        !!testToken,
      );

      const turnCreds = await mintTurnCreds(c);

      if (!turnCreds) return c.json(TurnCredentialsUnavailable, 500);

      return c.json(
        {
          id: dropId,
          nonce,
          turnCreds,
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

      // get drop
      const dropKey = formatDropKey(dropId);
      // Annotated because `web` typechecks this file without
      // @cloudflare/workers-types, where KVNamespace resolves to unknown
      // and the RPC response type collapses to {}.
      const dropDetails: DropDetails | null =
        await c.env.DROP_STORE.get<DropDetails>(dropKey, 'json');

      if (!dropDetails) return c.json(SessionNotFound, 404);

      // lazy-default drops created before maxGrabbers existed
      const turnCreds = await mintTurnCreds(c);

      if (!turnCreds) return c.json(TurnCredentialsUnavailable, 500);

      return c.json(
        {
          ...dropDetails,
          maxGrabbers: dropDetails.maxGrabbers ?? 1,
          turnCreds,
        },
        200,
      );
    },
  )
  .delete(
    AppRouteParts.Root,
    zValidator('json', dropIdSchema),
    async (c) => {
      const { id: dropId } = c.req.valid('json');

      const dropKey = formatDropKey(dropId);

      const success = await c.env.DROP_STORE.delete(dropKey)
        .then(() => true)
        .catch(() => false);

      return c.json({ success }, success ? 200 : 500);
    },
  );

export default dropRouter;
