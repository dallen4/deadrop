import { cors as baseCors } from 'hono/cors';
import { AppHeaders } from '../constants';
import { Middleware } from './http/core';

export const tracing = (): Middleware => async (c, next) => {
  c.set('requestId', crypto.randomUUID());

  const ipAddress = c.req.header(AppHeaders.IpAddress)! as string;
  c.set('ipAddress', ipAddress);

  await next();
};

export const cors = (): Middleware =>
  baseCors({
    origin: [
      'https://deadrop.io',
      'https://*nieky-allens-projects.vercel.app',
      'https://*nieky.vercel.app',
    ],
    allowHeaders: ['Content-Type', 'Authorization', 'Set-Cookie'],
    allowMethods: ['GET', 'HEAD', 'OPTIONS'],
    credentials: true,
  });
