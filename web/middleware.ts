import { NextResponse } from 'next/server';
import type { NextRequest, NextMiddleware } from 'next/server';
import { nanoid } from 'nanoid';
import {
  DISABLE_CAPTCHA_COOKIE,
  DAILY_DROP_LIMIT_COOKIE,
  NONCE_COOKIE,
} from 'config/cookies';
import { get } from '@vercel/edge-config';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const nonce = request.cookies.get(NONCE_COOKIE);

  if (!nonce) {
    response.cookies.set(NONCE_COOKIE, nanoid(), {
      path: '/',
      secure: process.env.NODE_ENV !== 'development',
      httpOnly: true,
      sameSite: true,
    });

    console.log('Nonce set');
  }

  const limitCookie = request.cookies.get(DAILY_DROP_LIMIT_COOKIE);

  if (!limitCookie) {
    const dailyDropLimit = await get<number>(DAILY_DROP_LIMIT_COOKIE);

    response.cookies.set(DAILY_DROP_LIMIT_COOKIE, dailyDropLimit, {
      path: '/',
      secure: process.env.NODE_ENV !== 'development',
      httpOnly: true,
      sameSite: true,
    });

    console.log('Drop limit set');
  }

  // disable captcha if in development mode
  if (
    process.env.NODE_ENV === 'development' &&
    !request.cookies.get(DISABLE_CAPTCHA_COOKIE)
  ) {
    console.log('Disabling captcha');
    response.cookies.set(DISABLE_CAPTCHA_COOKIE, true, { sameSite: true });
  }

  return response;
}

export const config = {
  matcher: '/',
};
