/**
 * Strict validation utilities to replace 'any' types
 */

import {
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationSchema,
  FormField,
  FormValidationResult,
  RequestValidationSchema,
  ValidatedRequest,
  SecurityValidationOptions,
  isJsonValue,
  isString,
  isArray,
  isObject,
} from './types';
import { JsonValue } from '@/lib/types/api';
import { sanitizeUserInput } from '@/lib/security/sanitize';

/**
 * Validates a single value against a validation rule
 */
export function validateValue<T>(
  value: unknown,
  rule: ValidationRule<T>,
  fieldName = 'value'
): ValidationResult<T> {
  const isValid = rule.validate(value);
  
  if (isValid) {
    return {
      isValid: true,
      value: value as T,
      errors: []
    };
  }
  
  return {
    isValid: false,
    errors: [{
      field: fieldName,
      message: rule.message,
      code: rule.code,
      value
    }]
  };
}

/**
 * Validates an object against a schema
 */
export function validateObject<T extends Record<string, unknown>>(
  obj: unknown,
  schema: ValidationSchema,
  options: SecurityValidationOptions = {}
): ValidationResult<T> {
  if (!isObject(obj)) {
    return {
      isValid: false,
      errors: [{
        field: 'root',
        message: 'Value must be an object',
        code: 'NOT_OBJECT',
        value: obj
      }]
    };
  }

  // Security checks
  if (options.preventPrototypePollution) {
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    for (const key of dangerousKeys) {
      if (key in obj) {
        return {
          isValid: false,
          errors: [{
            field: key,
            message: 'Dangerous property detected',
            code: 'PROTOTYPE_POLLUTION',
            value: obj[key]
          }]
        };
      }
    }
  }

  if (options.maxKeys && Object.keys(obj).length > options.maxKeys) {
    return {
      isValid: false,
      errors: [{
        field: 'root',
        message: `Too many properties (max: ${options.maxKeys})`,
        code: 'TOO_MANY_KEYS',
        value: Object.keys(obj).length
      }]
    };
  }

  const errors: ValidationError[] = [];
  const validatedObj = Object.create(null) as Record<string, unknown>;

  for (const [fieldName, rules] of Object.entries(schema)) {
    const fieldValue = obj[fieldName];
    const fieldRules = Array.isArray(rules) ? rules : [rules];

    for (const rule of fieldRules) {
      const result = validateValue(fieldValue, rule, fieldName);
      
      if (!result.isValid) {
        errors.push(...result.errors);
        break; // Stop at first validation error for this field
      } else if (result.value !== undefined) {
        validatedObj[fieldName] = result.value;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    value: errors.length === 0 ? (validatedObj as T) : undefined,
    errors
  };
}

/**
 * Validates and sanitizes form data
 */
export function validateForm(fields: FormField[]): FormValidationResult {
  const errors: Record<string, ValidationError[]> = {};
  const allFieldErrors: ValidationError[] = [];
  const values: Record<string, JsonValue> = {};

  for (const field of fields) {
    const fieldErrors: ValidationError[] = [];
    let processedValue = field.value;

    // Sanitize input if specified
    if (field.sanitize && isString(processedValue)) {
      const sanitizeType = field.sanitize.type === 'json' ? 'text' : field.sanitize.type;
      processedValue = sanitizeUserInput(processedValue, sanitizeType);
    }

    // Check required fields
    if (field.required && (processedValue === undefined || processedValue === null || processedValue === '')) {
      fieldErrors.push({
        field: field.name,
        message: 'This field is required',
        code: 'REQUIRED',
        value: processedValue
      });
    } else {
      // Validate against rules
      for (const rule of field.rules) {
        const result = validateValue(processedValue, rule, field.name);
        if (!result.isValid) {
          fieldErrors.push(...result.errors);
          break; // Stop at first validation error
        } else if (result.value !== undefined && isJsonValue(result.value)) {
          processedValue = result.value;
        }
      }
    }

    // Store field errors and values
    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
      allFieldErrors.push(...fieldErrors);
    } else if (isJsonValue(processedValue)) {
      values[field.name] = processedValue;
    }
  }

  return {
    isValid: allFieldErrors.length === 0,
    values,
    errors,
    fieldErrors: allFieldErrors
  };
}

/**
 * Validates API request data
 */
export function validateRequest<
  TBody extends Record<string, unknown> = Record<string, unknown>,
  TQuery extends Record<string, unknown> = Record<string, unknown>,
  TParams extends Record<string, unknown> = Record<string, unknown>,
  THeaders extends Record<string, unknown> = Record<string, unknown>
>(
  request: {
    body?: unknown;
    query?: unknown;
    params?: unknown;
    headers?: unknown;
  },
  schema: RequestValidationSchema,
  options: SecurityValidationOptions = {}
): ValidationResult<ValidatedRequest<TBody, TQuery, TParams, THeaders>> {
  const errors: ValidationError[] = [];
  const validated: ValidatedRequest<TBody, TQuery, TParams, THeaders> = {};

  // Validate body
  if (schema.body && request.body !== undefined) {
    const result = validateObject<TBody>(request.body, schema.body, options);
    if (result.isValid && result.value) {
      validated.body = result.value;
    } else {
      errors.push(...result.errors.map(err => ({ ...err, field: `body.${err.field}` })));
    }
  }

  // Validate query parameters
  if (schema.query && request.query !== undefined) {
    const result = validateObject<TQuery>(request.query, schema.query, options);
    if (result.isValid && result.value) {
      validated.query = result.value;
    } else {
      errors.push(...result.errors.map(err => ({ ...err, field: `query.${err.field}` })));
    }
  }

  // Validate URL parameters
  if (schema.params && request.params !== undefined) {
    const result = validateObject<TParams>(request.params, schema.params, options);
    if (result.isValid && result.value) {
      validated.params = result.value;
    } else {
      errors.push(...result.errors.map(err => ({ ...err, field: `params.${err.field}` })));
    }
  }

  // Validate headers
  if (schema.headers && request.headers !== undefined) {
    const result = validateObject<THeaders>(request.headers, schema.headers, options);
    if (result.isValid && result.value) {
      validated.headers = result.value;
    } else {
      errors.push(...result.errors.map(err => ({ ...err, field: `headers.${err.field}` })));
    }
  }

  return {
    isValid: errors.length === 0,
    value: errors.length === 0 ? validated : undefined,
    errors
  };
}

/**
 * Validates nested objects with depth checking
 */
export function validateNestedObject(
  obj: unknown,
  maxDepth = 10,
  currentDepth = 0
): ValidationResult<Record<string, JsonValue>> {
  if (currentDepth > maxDepth) {
    return {
      isValid: false,
      errors: [{
        field: 'root',
        message: `Maximum nesting depth exceeded (${maxDepth})`,
        code: 'MAX_DEPTH_EXCEEDED',
        value: currentDepth
      }]
    };
  }

  if (!isObject(obj)) {
    return {
      isValid: false,
      errors: [{
        field: 'root',
        message: 'Value must be an object',
        code: 'NOT_OBJECT',
        value: obj
      }]
    };
  }

  const errors: ValidationError[] = [];
  const validated: Record<string, JsonValue> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isJsonValue(value)) {
      if (isObject(value)) {
        const nestedResult = validateNestedObject(value, maxDepth, currentDepth + 1);
        if (nestedResult.isValid && nestedResult.value) {
          validated[key] = nestedResult.value;
        } else {
          errors.push(...nestedResult.errors.map(err => ({ 
            ...err, 
            field: `${key}.${err.field}` 
          })));
        }
      } else {
        validated[key] = value;
      }
    } else {
      errors.push({
        field: key,
        message: 'Value is not JSON serializable',
        code: 'NOT_JSON_SERIALIZABLE',
        value
      });
    }
  }

  return {
    isValid: errors.length === 0,
    value: errors.length === 0 ? validated : undefined,
    errors
  };
}

/**
 * Type-safe array validation
 */
export function validateArray<T>(
  value: unknown,
  itemValidator: ValidationRule<T>,
  options: { minLength?: number; maxLength?: number } = {}
): ValidationResult<T[]> {
  if (!isArray(value)) {
    return {
      isValid: false,
      errors: [{
        field: 'root',
        message: 'Value must be an array',
        code: 'NOT_ARRAY',
        value
      }]
    };
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    return {
      isValid: false,
      errors: [{
        field: 'root',
        message: `Array too short (min: ${options.minLength})`,
        code: 'ARRAY_TOO_SHORT',
        value: value.length
      }]
    };
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    return {
      isValid: false,
      errors: [{
        field: 'root',
        message: `Array too long (max: ${options.maxLength})`,
        code: 'ARRAY_TOO_LONG',
        value: value.length
      }]
    };
  }

  const errors: ValidationError[] = [];
  const validatedItems: T[] = [];

  for (let i = 0; i < value.length; i++) {
    const itemResult = validateValue(value[i], itemValidator, `[${i}]`);
    if (itemResult.isValid && itemResult.value !== undefined) {
      validatedItems.push(itemResult.value);
    } else {
      errors.push(...itemResult.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    value: errors.length === 0 ? validatedItems : undefined,
    errors
  };
}

/**
 * Creates a validation error
 */
export function createValidationError(
  field: string,
  message: string,
  code: string,
  value?: unknown
): ValidationError {
  return { field, message, code, value };
}

/**
 * Combines multiple validation results
 */
export function combineValidationResults<T>(
  results: ValidationResult<T>[]
): ValidationResult<T[]> {
  const errors: ValidationError[] = [];
  const values: T[] = [];

  for (const result of results) {
    if (result.isValid && result.value !== undefined) {
      values.push(result.value);
    } else {
      errors.push(...result.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    value: errors.length === 0 ? values : undefined,
    errors
  };
}
