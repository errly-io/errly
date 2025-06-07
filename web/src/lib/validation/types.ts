/**
 * Strict validation types to replace 'any' usage
 */

import { JsonValue } from '@/lib/types/api';

// Base validation types
export interface ValidationRule<T = unknown> {
  validate: (value: unknown) => value is T;
  message: string;
  code: string;
}

export interface ValidationResult<T = unknown> {
  isValid: boolean;
  value?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationSchema {
  [field: string]: ValidationRule | ValidationRule[];
}

// Specific validation types
export interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowEmpty?: boolean;
  trim?: boolean;
}

export interface NumberValidationOptions {
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
}

export interface ArrayValidationOptions<T = unknown> {
  minLength?: number;
  maxLength?: number;
  itemValidator?: ValidationRule<T>;
}

export interface ObjectValidationOptions {
  allowAdditionalProperties?: boolean;
  requiredFields?: string[];
  schema?: ValidationSchema;
}

// Input sanitization types
export type SanitizationType = 'text' | 'html' | 'email' | 'url' | 'filename' | 'json';

export interface SanitizationOptions {
  type: SanitizationType;
  maxLength?: number;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  removeEmpty?: boolean;
}

// Form validation types
export interface FormField<T = unknown> {
  name: string;
  value: unknown;
  rules: ValidationRule<T>[];
  required?: boolean;
  sanitize?: SanitizationOptions;
}

export interface FormValidationResult {
  isValid: boolean;
  values: Record<string, JsonValue>;
  errors: Record<string, ValidationError[]>;
  fieldErrors: ValidationError[];
}

// API request validation types
export interface RequestValidationSchema {
  body?: ValidationSchema;
  query?: ValidationSchema;
  params?: ValidationSchema;
  headers?: ValidationSchema;
}

export interface ValidatedRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
  THeaders = unknown
> {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
  headers?: THeaders;
}

// File validation types
export interface FileValidationOptions {
  maxSize?: number; // bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
  requireExtension?: boolean;
}

export interface ValidatedFile {
  name: string;
  size: number;
  type: string;
  extension: string;
  content: Buffer | ArrayBuffer;
}

// Database validation types
export interface DatabaseValidationOptions {
  tableName: string;
  allowedFields: string[];
  requiredFields: string[];
  uniqueFields?: string[];
}

// Security validation types
export interface SecurityValidationOptions {
  preventXSS?: boolean;
  preventSQLInjection?: boolean;
  preventPathTraversal?: boolean;
  preventPrototypePollution?: boolean;
  maxDepth?: number;
  maxKeys?: number;
}

// Type guards for validation
export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'field' in error &&
    'message' in error &&
    'code' in error
  );
}

export function isValidationResult<T>(result: unknown): result is ValidationResult<T> {
  return (
    typeof result === 'object' &&
    result !== null &&
    'isValid' in result &&
    'errors' in result &&
    typeof (result as ValidationResult).isValid === 'boolean' &&
    Array.isArray((result as ValidationResult).errors)
  );
}

export function isFormValidationResult(result: unknown): result is FormValidationResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'isValid' in result &&
    'values' in result &&
    'errors' in result &&
    'fieldErrors' in result
  );
}

// Common validation predicates
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function isUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isUuid(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isIsoDate(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value === date.toISOString();
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  
  return false;
}

// Validation rule builders
export function createStringRule(options: StringValidationOptions = {}): ValidationRule<string> {
  return {
    validate: (value: unknown): value is string => {
      if (!isString(value)) return false;
      
      const str = options.trim ? value.trim() : value;
      
      if (!options.allowEmpty && str.length === 0) return false;
      if (options.minLength !== undefined && str.length < options.minLength) return false;
      if (options.maxLength !== undefined && str.length > options.maxLength) return false;
      if (options.pattern && !options.pattern.test(str)) return false;
      
      return true;
    },
    message: 'Invalid string value',
    code: 'INVALID_STRING'
  };
}

export function createNumberRule(options: NumberValidationOptions = {}): ValidationRule<number> {
  return {
    validate: (value: unknown): value is number => {
      if (!isNumber(value)) return false;
      
      if (options.integer && !Number.isInteger(value)) return false;
      if (options.positive && value <= 0) return false;
      if (options.min !== undefined && value < options.min) return false;
      if (options.max !== undefined && value > options.max) return false;
      
      return true;
    },
    message: 'Invalid number value',
    code: 'INVALID_NUMBER'
  };
}

export function createArrayRule<T>(options: ArrayValidationOptions<T> = {}): ValidationRule<T[]> {
  return {
    validate: (value: unknown): value is T[] => {
      if (!isArray(value)) return false;
      
      if (options.minLength !== undefined && value.length < options.minLength) return false;
      if (options.maxLength !== undefined && value.length > options.maxLength) return false;
      
      if (options.itemValidator) {
        return value.every(item => options.itemValidator?.validate(item) ?? false);
      }
      
      return true;
    },
    message: 'Invalid array value',
    code: 'INVALID_ARRAY'
  };
}

export function createObjectRule(options: ObjectValidationOptions = {}): ValidationRule<Record<string, unknown>> {
  return {
    validate: (value: unknown): value is Record<string, unknown> => {
      if (!isObject(value)) return false;
      
      if (options.requiredFields) {
        for (const field of options.requiredFields) {
          if (!(field in value)) return false;
        }
      }
      
      if (!options.allowAdditionalProperties && options.schema) {
        const allowedKeys = Object.keys(options.schema);
        const valueKeys = Object.keys(value);
        
        for (const key of valueKeys) {
          if (!allowedKeys.includes(key)) return false;
        }
      }
      
      return true;
    },
    message: 'Invalid object value',
    code: 'INVALID_OBJECT'
  };
}

// Email validation rule
export const emailRule: ValidationRule<string> = {
  validate: isEmail,
  message: 'Invalid email address',
  code: 'INVALID_EMAIL'
};

// URL validation rule
export const urlRule: ValidationRule<string> = {
  validate: isUrl,
  message: 'Invalid URL',
  code: 'INVALID_URL'
};

// UUID validation rule
export const uuidRule: ValidationRule<string> = {
  validate: isUuid,
  message: 'Invalid UUID',
  code: 'INVALID_UUID'
};

// ISO date validation rule
export const isoDateRule: ValidationRule<string> = {
  validate: isIsoDate,
  message: 'Invalid ISO date',
  code: 'INVALID_DATE'
};
