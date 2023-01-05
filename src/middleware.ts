import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { DISABLE_CAPTCHA_COOKIE, NONCE_COOKIE } from '~config/cookies';

export function middleware(request: NextRequest) {
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
