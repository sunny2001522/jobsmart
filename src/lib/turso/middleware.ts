import { NextResponse, type NextRequest } from 'next/server';
const SESSION_COOKIE = 'jobsmart_session';

export async function updateSession(request: NextRequest) {
  const isAuthenticated = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/applications', '/resume', '/interview', '/linkedin', '/values', '/companies'];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/login', '/register'];
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPath && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/applications';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
