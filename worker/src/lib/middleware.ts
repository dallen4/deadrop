import { cors as baseCors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { AppHeaders } from '../constants';
import { HonoCtx, Middleware } from './http/core';
import { Redis } from '@upstash/redis/cloudflare';
import {
  NotAuthenticated,
  PermissionDenied,
  ServiceForbidden,
} from './messages';
import { TEST_TOKEN_HEADER } from '@shared/tests/http';
import { SERVICE_TOKEN_HEADER } from '@shared/lib/constants';

// Constant-time string comparison so token validation doesn't leak
// timing information. Length is allowed to short-circuit.
const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
};

export const tracing = () =>
  createMiddleware<HonoCtx>(async (c, next) => {
    const ipAddress = c.req.header(AppHeaders.IpAddress)! as string;

    c.set('ipAddress', ipAddress);

    await next();
  });

const originRoots = [
  'deadrop.io',
  '-nieky-allens-projects.vercel.app',
  'nieky.vercel.app',
  'deadrop.vercel.app',
];

export const cors = (): Middleware =>
  baseCors({
    origin: (origin) => {
      if (
        origin.startsWith('https://') &&
        originRoots.some((root) => origin.endsWith(root))
      )
        return origin;

      // VS Code webview panels use a vscode-webview:// origin
      if (origin.startsWith('vscode-webview://')) return origin;
      else return null;
    },
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'Set-Cookie',
      TEST_TOKEN_HEADER,
    ],
    allowMethods: ['GET', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
    credentials: true,
  });

export const redis = () =>
  createMiddleware<HonoCtx>(async (c, next) => {
    const redisClient = Redis.fromEnv(c.env);
    c.set('redis', redisClient);

    await next();
  });

export const authenticated = () =>
  createMiddleware<HonoCtx>(async (c, next) => {
    const auth = c.var.clerkAuth();

    if (!auth?.userId) {
      return c.json(NotAuthenticated, 401);
    }

    await next();
  });

// only allowed if user has been granted early_access or marked as internal
export const restricted = () =>
  createMiddleware<HonoCtx>(async (c, next) => {
    const auth = c.var.clerkAuth();

    if (!auth?.userId) {
      return c.json(NotAuthenticated, 401);
    }

    const claims = auth.sessionClaims;

    const canAccess =
      claims.early_access || claims.internal ? true : false;

    if (!canAccess) {
      return c.json(PermissionDenied, 401);
    }

    await next();
  });

// First-party service-to-service auth
export const service = () =>
  createMiddleware<HonoCtx>(async (c, next) => {
    const expected = c.env.WORKER_SERVICE_TOKEN;
    const provided = c.req.header(SERVICE_TOKEN_HEADER);

    if (
      !expected ||
      !provided ||
      !timingSafeEqual(provided, expected)
    ) {
      return c.json(ServiceForbidden, 401);
    }

    await next();
  });
