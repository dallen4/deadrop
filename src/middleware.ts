import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { NONCE_COOKIE } from '@lib/constants';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    const nonce = request.cookies.get(NONCE_COOKIE);

    if (!nonce)
        response.cookies.set(NONCE_COOKIE, nanoid(), {
            path: '/',
            // secure: true,
            httpOnly: true,
            sameSite: true,
        });

    return response;
}

export const config = {
    matcher: '/',
};
