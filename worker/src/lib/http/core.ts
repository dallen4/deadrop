import { Hono, MiddlewareHandler } from 'hono';
import { RequestIdVariables } from 'hono/request-id';
import { Redis } from '@upstash/redis/cloudflare';
import { ClerkHonoVariables } from '@clerk/hono';

export type HonoCtx = {
  Bindings: Env;
  Variables: {
    ipAddress?: string;
    error?: boolean;
    userId?: string;
    claims?: Record<string, any>;

    redis: Redis;
  } & RequestIdVariables &
    ClerkHonoVariables;
};

export type Middleware = MiddlewareHandler<HonoCtx, string, {}>;

export const hono = () => new Hono<HonoCtx>();
