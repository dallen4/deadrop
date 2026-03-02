import { createCookie } from 'react-router';
import { DAILY_DROP_LIMIT_COOKIE } from '../../config/cookies';
import type { Route } from '../+types/root';

const DEFAULT_DAILY_DROP_LIMIT = 5;

const dropLimitCookie = createCookie(DAILY_DROP_LIMIT_COOKIE, {
  path: '/',
  httpOnly: true,
  sameSite: 'strict',
  secure: true,
});

export const dropLimitMiddleware: Route.MiddlewareFunction = async (
  { request },
  next,
) => {
  const cookieHeader = request.headers.get('Cookie');
  const existingLimit = await dropLimitCookie.parse(cookieHeader);
  const response = await next();

  if (!existingLimit) {
    response.headers.append(
      'Set-Cookie',
      await dropLimitCookie.serialize(DEFAULT_DAILY_DROP_LIMIT),
    );
  }

  return response;
};
