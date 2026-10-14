import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/login(.*)', '/sso-callback(.*)', '/api/(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
  ) {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== request.headers.get('host')) {
      return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
    }
  }
  if (!isPublicRoute(request) && !(await auth()).userId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
});
export const config = {
  matcher: [
    '/((?!offline|_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)',
    '/api/(.*)',
  ],
};
