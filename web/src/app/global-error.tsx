'use client';

import { useEffect } from 'react';
import { createSafeError, escapeHtml } from '@/lib/security/error-handling';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Create secure error for logging
    const secureError = createSafeError(error, 'GLOBAL_ERROR');

    // Log securely - in production this should go to your error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service (Sentry, LogRocket, etc.)
      // Example: Sentry.captureException(secureError);
      console.error('Global error:', secureError.toJSON());
    } else {
      console.error('Global error:', secureError.toDetailedJSON());
    }
  }, [error]);

  // Create secure error for display
  const secureError = createSafeError(error, 'GLOBAL_ERROR');
  const safeMessage = process.env.NODE_ENV === 'development'
    ? escapeHtml(secureError.message)
    : 'An unexpected error occurred.';

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '20px',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h1 style={{
              color: '#dc3545',
              marginBottom: '20px',
              fontSize: '24px'
            }}>
              Something went wrong!
            </h1>

            <p style={{
              color: '#6c757d',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              {safeMessage}
            </p>

            {process.env.NODE_ENV === 'development' && error.digest && (
              <p style={{
                fontSize: '12px',
                color: '#6c757d',
                fontFamily: 'monospace',
                marginBottom: '20px'
              }}>
                Error ID: {error.digest}
              </p>
            )}

            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#0056b3';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#007bff';
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
