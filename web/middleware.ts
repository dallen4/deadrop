import {
  clerkMiddleware,
  createRouteMatcher,
} from '@clerk/nextjs/server';
import { TEST_TOKEN_COOKIE } from '@shared/tests/http';
import { get } from '@vercel/edge-config';
import {
  DAILY_DROP_LIMIT_COOKIE,
  NONCE_COOKIE,
} from 'config/cookies';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) auth().protect();

  const response = NextResponse.next();

  const nonce = req.cookies.get(NONCE_COOKIE);

  if (!nonce) {
    response.cookies.set(NONCE_COOKIE, nanoid(), {
      path: '/',
      secure: process.env.NODE_ENV !== 'development',
      httpOnly: true,
      sameSite: true,
    });

    console.log('Nonce set');
  }

  const limitCookie = req.cookies.get(DAILY_DROP_LIMIT_COOKIE);

  if (!limitCookie) {
    const dailyDropLimit = await get<number>(DAILY_DROP_LIMIT_COOKIE);

    response.cookies.set(
      DAILY_DROP_LIMIT_COOKIE,
      dailyDropLimit!.toString(),
      {
        path: '/',
        secure: process.env.NODE_ENV !== 'development',
        httpOnly: true,
        sameSite: true,
      },
    );

    console.log('Drop limit set');
  }

  // disable captcha if in development mode
  if (
    process.env.NODE_ENV === 'development' &&
    !req.cookies.get(TEST_TOKEN_COOKIE)
  ) {
    console.log('Disabling captcha');
    response.cookies.set(TEST_TOKEN_COOKIE, 'true', {
      sameSite: true,
    });
  }

  return response;
});

export const config = {
  matcher: '/',
};
