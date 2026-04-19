import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('access_token')?.value;
    const { pathname } = request.nextUrl;

    const isPublicRoute = pathname === '/' || pathname === '/register';
    const isProtectedRoute = pathname.startsWith('/chat');

    // Redirect unauthenticated users to login
    if (isProtectedRoute && !token) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Redirect authenticated users to chat
    if (isPublicRoute && token) {
        return NextResponse.redirect(new URL('/chat', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/register', '/chat/:path*'],
};
