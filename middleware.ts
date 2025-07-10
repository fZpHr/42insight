import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  const protectedRoutes = ['/dashboard', '/exam-tracker', '/links', '/query', '/piscine','/trombinoscope', '/rankings', '/api', '/contribute'];
  const poolRestrictedRoutes = ['/query', '/rankings', '/trombinoscope', '/exam-tracker'];
  
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isPoolRestrictedRoute = poolRestrictedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isPoolRestrictedRoute && token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      const { payload } = await jwtVerify(token, secret);
      
      // if (!payload) {
      //   return NextResponse.redirect(new URL('/', request.url));
      // }

      
      if (payload.isPoolUser) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      console.error('JWT verification failed:', error);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/query/:path*',
    '/rankings/:path*',
    '/trombinoscope/:path*',
    '/exam-tracker/:path*',
    '/correction-slots/:path*',
    '/piscine/:path*',
    '/links/:path*',
    '/contribute/:path*',
  ],
};