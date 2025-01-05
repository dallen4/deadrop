import {
  clerkMiddleware,
  createRouteMatcher,
} from '@clerk/nextjs/server';
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

  return response;
});

export const config = {
  matcher: '/',
};
