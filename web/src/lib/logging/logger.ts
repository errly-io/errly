type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, string | number | boolean | null | undefined>;

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isClient = typeof window !== 'undefined';

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;
    
    let formatted = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(context)}`;
    }
    
    if (error) {
      formatted += ` | Error: ${error.message}`;
      if (error.stack && this.isDevelopment) {
        formatted += `\nStack: ${error.stack}`;
      }
    }
    
    return formatted;
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
      ...(error && { error })
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true; // Log everything in development
    }
    
    // In production, only log warnings and errors
    return ['warn', 'error'].includes(level);
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatMessage(entry);

    // In development, use console methods
    if (this.isDevelopment) {
      switch (entry.level) {
        case 'debug':
          console.debug(formatted);
          break;
        case 'info':
          console.info(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        case 'error':
          console.error(formatted);
          break;
      }
      return;
    }

    // In production, send to logging service
    this.sendToLoggingService(entry);
  }

  private sendToLoggingService(entry: LogEntry): void {
    // In production, you would send logs to a service like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - CloudWatch
    // - Custom logging endpoint
    
    if (this.isClient) {
      // Client-side logging
      // Could send to analytics or error tracking service
      if (entry.level === 'error') {
        // Send error to error tracking service
        // Example: Sentry.captureException(entry.error || new Error(entry.message));
      }
    } else {
      // Server-side logging
      // Could write to file, database, or external service
      // For now, just use console in production too (but filtered)
      if (entry.level === 'error') {
        console.error(this.formatMessage(entry));
      } else if (entry.level === 'warn') {
        console.warn(this.formatMessage(entry));
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('debug', message, context);
    this.writeLog(entry);
  }

  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('info', message, context);
    this.writeLog(entry);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    const entry = this.createLogEntry('warn', message, context, error);
    this.writeLog(entry);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    const entry = this.createLogEntry('error', message, context, error);
    this.writeLog(entry);
  }

  // Convenience methods for common scenarios
  apiError(endpoint: string, error: Error, context?: LogContext): void {
    // Import here to avoid circular dependencies
    const { createSafeError } = require('@/lib/security/error-handling');
    const secureError = createSafeError(error, 'API_ERROR');

    this.error(`API Error: ${endpoint}`, {
      endpoint,
      errorCode: secureError.code,
      timestamp: secureError.timestamp,
      ...context
    }, error);
  }

  authError(action: string, error: Error, context?: LogContext): void {
    const { createSafeError } = require('@/lib/security/error-handling');
    const secureError = createSafeError(error, 'AUTH_ERROR');

    this.error(`Auth Error: ${action}`, {
      action,
      errorCode: secureError.code,
      timestamp: secureError.timestamp,
      ...context
    }, error);
  }

  validationError(field: string, value: unknown, reason: string): void {
    const { ValidationError } = require('@/lib/security/error-handling');
    const secureError = new ValidationError(field, reason, value);

    this.warn(`Validation Error: ${field}`, {
      field,
      reason,
      errorCode: secureError.code,
      timestamp: secureError.timestamp,
      // value is intentionally excluded for security
    });
  }

  securityEvent(event: string, context?: LogContext): void {
    // Security events should be logged with extra care
    const sanitizedContext = this.sanitizeContext(context);
    this.warn(`Security Event: ${event}`, {
      event,
      timestamp: Date.now(),
      ...sanitizedContext
    });
  }

  performanceWarning(operation: string, duration: number, threshold: number): void {
    this.warn(`Performance Warning: ${operation}`, { operation, duration, threshold });
  }

  // Helper method to sanitize context for security events
  private sanitizeContext(context?: LogContext): LogContext {
    if (!context) return {};

    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
    const sanitized: LogContext = {};

    for (const [key, value] of Object.entries(context)) {
      const isSensitive = sensitiveKeys.some(sensitive =>
        key.toLowerCase().includes(sensitive)
      );

      sanitized[key] = isSensitive ? '[REDACTED]' : value;
    }

    return sanitized;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext, error?: Error) => logger.warn(message, context, error),
  error: (message: string, context?: LogContext, error?: Error) => logger.error(message, context, error),
  
  // Specialized logging
  api: {
    error: (endpoint: string, error: Error, context?: LogContext) => logger.apiError(endpoint, error, context),
    request: (method: string, endpoint: string, context?: LogContext) =>
      logger.debug(`API Request: ${method} ${endpoint}`, context),
    response: (method: string, endpoint: string, status: number, duration?: number) =>
      logger.debug(`API Response: ${method} ${endpoint}`, { status, duration })
  },
  
  auth: {
    error: (action: string, error: Error, context?: LogContext) => logger.authError(action, error, context),
    success: (action: string, context?: LogContext) => logger.info(`Auth Success: ${action}`, context),
    attempt: (action: string, context?: LogContext) => logger.debug(`Auth Attempt: ${action}`, context)
  },

  security: {
    event: (event: string, context?: LogContext) => logger.securityEvent(event, context),
    violation: (violation: string, context?: LogContext) =>
      logger.error(`Security Violation: ${violation}`, context),
    rateLimitHit: (ip: string, endpoint: string) => 
      logger.securityEvent('Rate Limit Hit', { ip, endpoint })
  },
  
  validation: {
    error: (field: string, value: unknown, reason: string) => logger.validationError(field, value, reason),
    success: (fields: string[]) => logger.debug('Validation Success', { fields: fields.join(', ') })
  },
  
  performance: {
    warning: (operation: string, duration: number, threshold: number) => 
      logger.performanceWarning(operation, duration, threshold),
    timing: (operation: string, duration: number) => 
      logger.debug(`Performance: ${operation}`, { operation, duration })
  }
};
