import { NextRequest, NextResponse } from 'next/server';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';

// Generate CSRF token using Web Crypto API (Edge Runtime compatible)
export function generateCSRFToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(CSRF_TOKEN_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for environments without crypto
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

// Hash token for comparison using Web Crypto API
async function hashToken(token: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple hash (not cryptographically secure)
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Verify CSRF token
export async function verifyCSRFToken(request: NextRequest): Promise<boolean> {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  const tokenFromHeader = request.headers.get(CSRF_HEADER_NAME);
  const tokenFromCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!tokenFromHeader || !tokenFromCookie) {
    return false;
  }

  // Compare hashed tokens to prevent timing attacks
  const headerHash = await hashToken(tokenFromHeader);
  const cookieHash = await hashToken(tokenFromCookie);

  return headerHash === cookieHash;
}

// CSRF middleware
export function withCSRFProtection(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: any) => {
    if (!(await verifyCSRFToken(request))) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    return handler(request, context);
  };
}

// Set CSRF token in response
export function setCSRFToken(response: NextResponse): NextResponse {
  const token = generateCSRFToken();

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 // 24 hours
  });

  response.headers.set(CSRF_HEADER_NAME, token);

  return response;
}
