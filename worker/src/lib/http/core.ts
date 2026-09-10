import { Hono, MiddlewareHandler } from 'hono';
import { RequestIdVariables } from 'hono/request-id';
import { Redis } from '@upstash/redis/cloudflare';
import { ClerkHonoVariables } from '@clerk/hono';
import { PlanLimitSet } from '@shared/config/plans';

export type HonoCtx = {
  Bindings: Env;
  Variables: {
    ipAddress?: string;
    error?: boolean;
    userId?: string;
    claims?: Record<string, any>;
    // Set by authenticated(); undefined means the plan was unresolvable
    // (an API key's claims are its own, not billing claims), not unlimited.
    planLimits?: PlanLimitSet;

    redis: Redis;
  } & RequestIdVariables &
    ClerkHonoVariables;
};

export type Middleware = MiddlewareHandler<HonoCtx, string, {}>;

export const hono = () => new Hono<HonoCtx>();
