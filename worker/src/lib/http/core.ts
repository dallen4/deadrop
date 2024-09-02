import { Hono, MiddlewareHandler } from 'hono';

export type HonoCtx = {
  Bindings: Env;
  Variables: {
    requestId: string;
    ipAddress?: string;
    error?: boolean;
  };
};

export type Middleware = MiddlewareHandler<HonoCtx>;

export const hono = () => new Hono<HonoCtx>();
