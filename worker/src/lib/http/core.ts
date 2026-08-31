import { Hono, MiddlewareHandler } from 'hono';
import { RequestIdVariables } from 'hono/request-id';
import { Redis } from '@upstash/redis/cloudflare';

export type HonoCtx = {
  Bindings: Env;
  Variables: {
    ipAddress?: string;
    error?: boolean;
    userId?: string;
    claims?: Record<string, any>;

    redis: Redis;
  } & RequestIdVariables;
};

export type Middleware = MiddlewareHandler<HonoCtx, string, {}>;

export const hono = () => new Hono<HonoCtx>();
