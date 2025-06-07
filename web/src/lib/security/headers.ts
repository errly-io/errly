/**
 * Security Headers Middleware
 * 
 * Implements security headers to protect against common web vulnerabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { SECURITY_CONFIG } from './config';
import { ApiContext, JsonValue } from '@/lib/types/api';

// Extended NextRequest interface
interface NextRequestWithIP extends NextRequest {
  ip?: string;
}

/**
 * Applies security headers to the response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  const { HEADERS } = SECURITY_CONFIG;

  // Content Security Policy
  const cspDirectives = Object.entries(HEADERS.CSP)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
  
  response.headers.set('Content-Security-Policy', cspDirectives);

  // HTTP Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    const hstsValue = `max-age=${HEADERS.HSTS.maxAge}${
      HEADERS.HSTS.includeSubDomains ? '; includeSubDomains' : ''
    }${HEADERS.HSTS.preload ? '; preload' : ''}`;
    
    response.headers.set('Strict-Transport-Security', hstsValue);
  }

  // X-Frame-Options
  response.headers.set('X-Frame-Options', HEADERS.FRAME_OPTIONS);

  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', HEADERS.CONTENT_TYPE_OPTIONS);

  // Referrer Policy
  response.headers.set('Referrer-Policy', HEADERS.REFERRER_POLICY);

  // Permissions Policy
  const permissionsDirectives = Object.entries(HEADERS.PERMISSIONS_POLICY)
    .map(([directive, allowlist]) => 
      `${directive}=(${allowlist.length > 0 ? allowlist.join(' ') : ''})`
    )
    .join(', ');
  
  response.headers.set('Permissions-Policy', permissionsDirectives);

  // X-DNS-Prefetch-Control
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  // X-Download-Options
  response.headers.set('X-Download-Options', 'noopen');

  // X-Permitted-Cross-Domain-Policies
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');

  return response;
}

/**
 * Security headers middleware for Next.js API routes
 */
export function withSecurityHeaders<T = unknown>(
  handler: (request: NextRequest, context: ApiContext) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest, context: ApiContext) => {
    const response = await handler(request, context);
    return applySecurityHeaders(response);
  };
}

/**
 * Validates request headers for security
 */
export function validateRequestHeaders(request: NextRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    
    if (!contentType) {
      errors.push('Missing Content-Type header');
    } else if (!isValidContentType(contentType)) {
      errors.push('Invalid Content-Type header');
    }
  }

  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url',
  ];

  for (const header of suspiciousHeaders) {
    if (request.headers.has(header)) {
      errors.push(`Suspicious header detected: ${header}`);
    }
  }

  // Validate User-Agent (basic check)
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || userAgent.length < 10) {
    errors.push('Invalid or missing User-Agent header');
  }

  // Check for excessively long headers
  for (const [name, value] of request.headers.entries()) {
    if (value.length > 8192) { // 8KB limit
      errors.push(`Header too long: ${name}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Content-Type header
 */
function isValidContentType(contentType: string): boolean {
  const validTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
  ];

  return validTypes.some(type => contentType.startsWith(type));
}

/**
 * Creates a secure response with proper headers
 */
export function createSecureResponse<T = JsonValue>(
  data: T,
  status = 200,
  headers: Record<string, string> = {}
): NextResponse<T> {
  const response = NextResponse.json(data, { status, headers });
  return applySecurityHeaders(response) as NextResponse<T>;
}

/**
 * Creates an error response with security headers
 */
export function createSecureErrorResponse(
  error: string,
  status = 400,
  code?: string
): NextResponse {
  const errorData = {
    error,
    ...(code && { code }),
    timestamp: new Date().toISOString(),
  };

  const response = NextResponse.json(errorData, { status });
  return applySecurityHeaders(response);
}

/**
 * CORS configuration for API routes
 */
export function applyCorsHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const { CORS_CONFIG } = SECURITY_CONFIG.API;
  const origin = request.headers.get('origin');

  // Check if origin is allowed
  if (origin && CORS_CONFIG.origin.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  if (CORS_CONFIG.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token'
    );
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  return response;
}

/**
 * Middleware to apply both security and CORS headers
 */
export function withSecurityAndCors<T = unknown>(
  handler: (request: NextRequest, context: ApiContext) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest, context: ApiContext) => {
    // Validate request headers
    const validation = validateRequestHeaders(request);
    if (!validation.isValid) {
      return createSecureErrorResponse(
        'Invalid request headers',
        400,
        'INVALID_HEADERS'
      );
    }

    const response = await handler(request, context);

    // Apply security headers
    const secureResponse = applySecurityHeaders(response);

    // Apply CORS headers
    return applyCorsHeaders(secureResponse, request);
  };
}

/**
 * Rate limiting headers
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetTime.toString());

  if (remaining === 0) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}

/**
 * Security event logging
 */
export function logSecurityEvent(
  event: string,
  request: NextRequest,
  details?: Record<string, JsonValue>
): void {
  const securityLog = {
    event,
    timestamp: new Date().toISOString(),
    ip: (request as NextRequestWithIP).ip || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    url: request.url,
    method: request.method,
    ...details,
  };

  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to security monitoring service
    // securityMonitor.log(securityLog);
    console.warn('Security Event:', securityLog);
  } else {
    console.warn('Security Event:', securityLog);
  }
}
