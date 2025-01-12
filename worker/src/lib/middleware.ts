import { cors as baseCors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { AppHeaders } from '../constants';
import { HonoCtx, Middleware } from './http/core';
import { Redis } from '@upstash/redis/cloudflare';
import { NotAuthenticated, PermissionDenied } from './messages';

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
      else return null;
    },
    allowHeaders: ['Content-Type', 'Authorization', 'Set-Cookie'],
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
    const auth = c.get('clerkAuth');

    if (!auth?.userId) {
      return c.json(NotAuthenticated, 401);
    }

    await next();
  });

// only allowed if user has been granted early_access or marked as internal
export const restricted = () =>
  createMiddleware<HonoCtx>(async (c, next) => {
    const auth = c.get('clerkAuth');

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
