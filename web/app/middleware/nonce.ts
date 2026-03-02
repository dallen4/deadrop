import { createCookie } from 'react-router';
import { nanoid } from 'nanoid';
import { NONCE_COOKIE } from '../../config/cookies';
import type { Route } from '../+types/root';

const nonceCookie = createCookie(NONCE_COOKIE, {
  path: '/',
  httpOnly: true,
  sameSite: 'strict',
  secure: true,
});

export const nonceMiddleware: Route.MiddlewareFunction = async (
  { request },
  next,
) => {
  const cookieHeader = request.headers.get('Cookie');
  const existingNonce = await nonceCookie.parse(cookieHeader);
  const response = await next();

  if (!existingNonce) {
    response.headers.append(
      'Set-Cookie',
      await nonceCookie.serialize(nanoid()),
    );
  }

  return response;
};
