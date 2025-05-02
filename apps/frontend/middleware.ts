import { NextRequest, NextResponse } from "next/server";

// Define paths that DO NOT require authentication
const nonProtectedPaths = ['/login', '/register', '/verify']; // Use '/verify' to match '/verify/...' routes

export function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const refreshToken = req.cookies.get('refresh_token')?.value;

    // Helper function to check if the current path starts with any of the non-protected paths
    const isAccessingNonProtectedRoute = nonProtectedPaths.some(path => pathname.startsWith(path));

    // --- Scenario 1: User DOES NOT have a refresh token ---
    if (!refreshToken) {
        if(pathname==='/'){
            return NextResponse.next()
        }
        // If they are trying to access a PROTECTED path without a token, redirect to login
        if (!isAccessingNonProtectedRoute) {
            console.log(`[Middleware] No token, accessing protected path (${pathname}). Redirecting to /login.`);
            const loginUrl = new URL('/login', req.url);
            // Optionally add where they were trying to go, useful after login
            // loginUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(loginUrl);
        }
        // If they are accessing a NON-PROTECTED path without a token, allow them
        console.log(`[Middleware] No token, accessing non-protected path (${pathname}). Allowing.`);
        return NextResponse.next();
    }

    // --- Scenario 2: User DOES have a refresh token ---
    if (refreshToken) {
        // If they are trying to access a NON-PROTECTED path (like login/register) WITH a token,
        // redirect them to the home page (or dashboard) because they are already logged in.
        if (isAccessingNonProtectedRoute) {
            console.log(`[Middleware] Has token, accessing non-protected path (${pathname}). Redirecting to /.`)
            const homeUrl = new URL('/', req.url); // Redirect to home page
            return NextResponse.redirect(homeUrl);
        }

        // If they are accessing a PROTECTED path WITH a token, allow them
        console.log(`[Middleware] Has token, accessing protected path (${pathname}). Allowing.`);
        return NextResponse.next();
    }

    // Fallback (should not be reached with the logic above, but good practice)
    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all routes except static files, images, API routes, etc.
        '/((?!api|_next/static|_next/image|favicon.ico|images|ik.imagekit.io).*)',
    ],
};

