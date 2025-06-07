/**
 * Validation Types with exactOptionalPropertyTypes Support
 */

// Helper type for exactOptionalPropertyTypes compatibility
export type ExactValidationResult<T> = 
  | { isValid: true; value: T; errors: never[] }
  | { isValid: false; value?: never; errors: ValidationError[] };

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

// Re-export with exact types
export type ValidationResult<T> = ExactValidationResult<T>;

// Helper function to create successful validation result
export function createSuccessResult<T>(value: T): ValidationResult<T> {
  return {
    isValid: true,
    value,
    errors: [],
  };
}

// Helper function to create failed validation result
export function createFailureResult<T>(errors: ValidationError[]): ValidationResult<T> {
  return {
    isValid: false,
    errors,
  };
}

// Type guard for successful validation
export function isValidationSuccess<T>(result: ValidationResult<T>): result is { isValid: true; value: T; errors: never[] } {
  return result.isValid;
}

// Type guard for failed validation
export function isValidationFailure<T>(result: ValidationResult<T>): result is { isValid: false; value?: never; errors: ValidationError[] } {
  return !result.isValid;
}
