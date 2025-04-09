import { NextRequest, NextResponse } from "next/server";

const nonProtectedPaths = ['/login', '/verify/', '/register']
export const middleware = (req: NextRequest) => {
    try {
        const pathname = req.nextUrl.pathname;
        const isAccessingNonProtectedRoute = nonProtectedPaths.some(path => pathname.startsWith(path))

        const refresh_token = req.cookies.get('refresh_token')?.value;


        if (!refresh_token) {
            if (!isAccessingNonProtectedRoute) {
                const loginUrl = new URL('/login', req.url);
                loginUrl.searchParams.set('redirectedFrom', pathname);
                return NextResponse.redirect(loginUrl);


            }
            return NextResponse.next();
        }
        if (isAccessingNonProtectedRoute) {
            const home = new URL('/login', req.url);
            home.searchParams.set('redirectedFrom', pathname);


            return NextResponse.redirect(home)
        }

    } catch (error) {
        console.error("Error in middleware:", error);
        return NextResponse.next();

    }
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|images|).*)',
    ],
}

