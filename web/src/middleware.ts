import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimit, authRateLimit, uploadRateLimit } from '@/lib/security/rate-limit';
import { verifyCSRFToken, setCSRFToken } from '@/lib/security/csrf';
import {
  applySecurityHeaders,
  validateRequestHeaders,
  logSecurityEvent,
  createSecureErrorResponse
} from '@/lib/security/headers';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Validate request headers first
  const validation = validateRequestHeaders(request);

  if (!validation.isValid) {
    logSecurityEvent('invalid_headers', request, {
      errors: validation.errors,
    });

    return createSecureErrorResponse(
      'Invalid request headers',
      400,
      'INVALID_HEADERS'
    );
  }

  // Check for suspicious patterns in URL
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempt
    /javascript:/i,  // JavaScript protocol
    /data:/i,  // Data protocol (in URL)
    /vbscript:/i,  // VBScript protocol
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(request.url)) {
      logSecurityEvent('suspicious_url', request, {
        pattern: pattern.toString(),
        url: request.url,
      });

      return createSecureErrorResponse(
        'Suspicious request detected',
        400,
        'SUSPICIOUS_REQUEST'
      );
    }
  }

  // Continue with request processing
  const response = NextResponse.next();

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
    const responseWithCSRF = setCSRFToken(response);
    return applySecurityHeaders(responseWithCSRF);
  }

  // Apply security headers to all responses
  return applySecurityHeaders(response);
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
