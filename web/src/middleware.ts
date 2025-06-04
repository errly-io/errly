import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimit, authRateLimit, uploadRateLimit } from '@/lib/security/rate-limit';
import { verifyCSRFToken, setCSRFToken } from '@/lib/security/csrf';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security headers for all requests
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CSP header
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-inline/eval should be removed in production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    let rateLimitResponse: NextResponse | null = null;

    // Authentication endpoints - stricter rate limiting
    if (pathname.includes('/auth/') || pathname.includes('/password')) {
      rateLimitResponse = await authRateLimit(request);
    }
    // Upload endpoints - moderate rate limiting
    else if (pathname.includes('/avatar') || pathname.includes('/upload')) {
      rateLimitResponse = await uploadRateLimit(request);
    }
    // General API endpoints
    else {
      rateLimitResponse = await apiRateLimit(request);
    }

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // CSRF protection for state-changing operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      if (!(await verifyCSRFToken(request))) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }
  }

  // Set CSRF token for GET requests to API
  if (pathname.startsWith('/api/') && request.method === 'GET') {
    return setCSRFToken(response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
