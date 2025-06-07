import crypto from 'crypto';

/**
 * Utilities for API Key generation and management
 */

export function generateApiKey(projectSlug: string): { token: string; hash: string; prefix: string } {
  // Generate random bytes for the key
  const randomBytes = crypto.randomBytes(32);
  const randomString = randomBytes.toString('hex');
  
  // Create project prefix (first 4 chars of slug)
  const projectPrefix = projectSlug.substring(0, 4).toLowerCase();
  
  // Create the full token
  const token = `errly_${projectPrefix}_${randomString}`;
  
  // Create prefix for display (first 12 chars)
  const prefix = token.substring(0, 12);
  
  // Hash the token for storage
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  
  return {
    token,
    hash,
    prefix
  };
}

export function hashApiKey(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function validateApiKey(token: string): boolean {
  // Check if token matches expected format
  const apiKeyRegex = /^errly_[a-z0-9]{4}_[a-f0-9]{64}$/;
  return apiKeyRegex.test(token);
}

export function maskApiKey(prefix: string): string {
  return `${prefix}${'*'.repeat(20)}`;
}

export function getScopeDisplayName(scope: string): string {
  switch (scope) {
    case 'ingest':
      return 'Send Events';
    case 'read':
      return 'Read Data';
    case 'admin':
      return 'Full Access';
    default:
      return scope;
  }
}

// Note: getScopeDescription was removed as it was not used in the codebase

export function getScopeColor(scope: string): string {
  switch (scope) {
    case 'ingest':
      return 'blue';
    case 'read':
      return 'green';
    case 'admin':
      return 'red';
    default:
      return 'gray';
  }
}

export function isKeyExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}

export function getKeyStatus(expiresAt: Date | null, lastUsedAt: Date | null): {
  status: 'active' | 'expired' | 'unused';
  color: string;
  label: string;
} {
  if (isKeyExpired(expiresAt)) {
    return {
      status: 'expired',
      color: 'red',
      label: 'Expired'
    };
  }
  
  if (!lastUsedAt) {
    return {
      status: 'unused',
      color: 'yellow',
      label: 'Never Used'
    };
  }
  
  return {
    status: 'active',
    color: 'green',
    label: 'Active'
  };
}
