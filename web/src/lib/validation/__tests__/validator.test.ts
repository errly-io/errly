/**
 * Tests for strict validation system
 */

import { describe, it, expect } from 'vitest';
import {
  validateValue,
  validateObject,
  validateForm,
  validateRequest,
  validateArray,
  validateNestedObject,
  createValidationError,
  combineValidationResults,
} from '../validator';
import {
  createStringRule,
  createNumberRule,
  emailRule,
  urlRule,
  uuidRule,
  isoDateRule,
} from '../types';

describe('Validation System', () => {
  describe('validateValue', () => {
    it('should validate string values', () => {
      const rule = createStringRule({ minLength: 3, maxLength: 10 });
      
      const validResult = validateValue('hello', rule, 'test');
      expect(validResult.isValid).toBe(true);
      expect(validResult.value).toBe('hello');
      expect(validResult.errors).toHaveLength(0);
      
      const invalidResult = validateValue('hi', rule, 'test');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
      expect(invalidResult.errors[0].field).toBe('test');
    });

    it('should validate number values', () => {
      const rule = createNumberRule({ min: 0, max: 100, integer: true });
      
      const validResult = validateValue(42, rule, 'age');
      expect(validResult.isValid).toBe(true);
      expect(validResult.value).toBe(42);
      
      const invalidResult = validateValue(3.14, rule, 'age');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('INVALID_NUMBER');
    });

    it('should validate email addresses', () => {
      const validResult = validateValue('test@example.com', emailRule, 'email');
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = validateValue('invalid-email', emailRule, 'email');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('INVALID_EMAIL');
    });

    it('should validate URLs', () => {
      const validResult = validateValue('https://example.com', urlRule, 'website');
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = validateValue('not-a-url', urlRule, 'website');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('INVALID_URL');
    });

    it('should validate UUIDs', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const validResult = validateValue(validUuid, uuidRule, 'id');
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = validateValue('not-a-uuid', uuidRule, 'id');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('INVALID_UUID');
    });

    it('should validate ISO dates', () => {
      const validDate = '2023-12-25T10:30:00.000Z';
      const validResult = validateValue(validDate, isoDateRule, 'date');
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = validateValue('2023-12-25', isoDateRule, 'date');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('INVALID_DATE');
    });
  });

  describe('validateObject', () => {
    it('should validate objects against schema', () => {
      const schema = {
        name: createStringRule({ minLength: 1 }),
        age: createNumberRule({ min: 0, integer: true }),
        email: emailRule,
      };

      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = validateObject(validData, schema);
      expect(result.isValid).toBe(true);
      expect(result.value).toEqual(validData);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors', () => {
      const schema = {
        name: createStringRule({ minLength: 5 }),
        age: createNumberRule({ min: 18 }),
      };

      const invalidData = {
        name: 'Jo', // Too short
        age: 16,    // Too young
      };

      const result = validateObject(invalidData, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
      expect(result.errors.some(e => e.field === 'age')).toBe(true);
    });

    it('should prevent prototype pollution', () => {
      const schema = {
        name: createStringRule(),
      };

      const maliciousData = {
        name: 'test',
        __proto__: { polluted: true },
      };

      const result = validateObject(maliciousData, schema, {
        preventPrototypePollution: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PROTOTYPE_POLLUTION');
    });

    it('should enforce maximum keys limit', () => {
      const schema = {
        name: createStringRule(),
      };

      const dataWithTooManyKeys = {
        name: 'test',
        extra1: 'value1',
        extra2: 'value2',
        extra3: 'value3',
      };

      const result = validateObject(dataWithTooManyKeys, schema, {
        maxKeys: 2,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('TOO_MANY_KEYS');
    });
  });

  describe('validateArray', () => {
    it('should validate arrays with item validation', () => {
      const stringRule = createStringRule({ minLength: 1 });
      
      const validArray = ['apple', 'banana', 'cherry'];
      const result = validateArray(validArray, stringRule);
      
      expect(result.isValid).toBe(true);
      expect(result.value).toEqual(validArray);
    });

    it('should validate array length constraints', () => {
      const stringRule = createStringRule();
      
      const tooShortArray = ['apple'];
      const result = validateArray(tooShortArray, stringRule, {
        minLength: 3,
        maxLength: 10,
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('ARRAY_TOO_SHORT');
    });

    it('should validate individual array items', () => {
      const emailRule = createStringRule();
      emailRule.validate = (value): value is string => {
        return typeof value === 'string' && value.includes('@');
      };
      
      const mixedArray = ['valid@email.com', 'invalid-email'];
      const result = validateArray(mixedArray, emailRule);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === '[1]')).toBe(true);
    });
  });

  describe('validateForm', () => {
    it('should validate form fields', () => {
      const fields = [
        {
          name: 'username',
          value: 'johndoe',
          rules: [createStringRule({ minLength: 3 })],
          required: true,
        },
        {
          name: 'email',
          value: 'john@example.com',
          rules: [emailRule],
          required: true,
        },
        {
          name: 'age',
          value: 25,
          rules: [createNumberRule({ min: 18 })],
          required: false,
        },
      ];

      const result = validateForm(fields);
      
      expect(result.isValid).toBe(true);
      expect(result.values.username).toBe('johndoe');
      expect(result.values.email).toBe('john@example.com');
      expect(result.values.age).toBe(25);
      expect(result.fieldErrors).toHaveLength(0);
    });

    it('should handle required field validation', () => {
      const fields = [
        {
          name: 'username',
          value: '',
          rules: [createStringRule({ minLength: 3 })],
          required: true,
        },
      ];

      const result = validateForm(fields);

      expect(result.isValid).toBe(false);
      expect(result.fieldErrors).toHaveLength(1);
      expect(result.fieldErrors[0].field).toBe('username');
      expect(result.fieldErrors[0].code).toBe('REQUIRED');
    });
  });

  describe('validateRequest', () => {
    it('should validate API request data', () => {
      const schema = {
        body: {
          name: createStringRule({ minLength: 1 }),
          email: emailRule,
        },
        query: {
          page: createNumberRule({ min: 1, integer: true }),
        },
      };

      const request = {
        body: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        query: {
          page: 1,
        },
      };

      const result = validateRequest(request, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.value?.body?.name).toBe('John Doe');
      expect(result.value?.query?.page).toBe(1);
    });

    it('should handle validation errors in different sections', () => {
      const schema = {
        body: {
          email: emailRule,
        },
        query: {
          page: createNumberRule({ min: 1 }),
        },
      };

      const request = {
        body: {
          email: 'invalid-email',
        },
        query: {
          page: 0,
        },
      };

      const result = validateRequest(request, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field.startsWith('body.'))).toBe(true);
      expect(result.errors.some(e => e.field.startsWith('query.'))).toBe(true);
    });
  });

  describe('validateNestedObject', () => {
    it('should validate nested objects', () => {
      const nestedData = {
        user: {
          profile: {
            name: 'John',
            settings: {
              theme: 'dark',
            },
          },
        },
      };

      const result = validateNestedObject(nestedData, 5);
      
      expect(result.isValid).toBe(true);
      expect(result.value?.user).toBeDefined();
    });

    it('should prevent excessive nesting', () => {
      const deepObject: Record<string, unknown> = {};
      let current = deepObject;
      
      // Create object with 15 levels of nesting
      for (let i = 0; i < 15; i++) {
        current.next = {};
        current = current.next as Record<string, unknown>;
      }

      const result = validateNestedObject(deepObject, 10);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MAX_DEPTH_EXCEEDED');
    });
  });

  describe('Utility functions', () => {
    it('should create validation errors', () => {
      const error = createValidationError('username', 'Too short', 'MIN_LENGTH', 'ab');
      
      expect(error.field).toBe('username');
      expect(error.message).toBe('Too short');
      expect(error.code).toBe('MIN_LENGTH');
      expect(error.value).toBe('ab');
    });

    it('should combine validation results', () => {
      const results = [
        { isValid: true, value: 'test1', errors: [] },
        { isValid: true, value: 'test2', errors: [] },
        { isValid: false, value: undefined, errors: [createValidationError('field', 'error', 'CODE')] },
      ];

      const combined = combineValidationResults(results);
      
      expect(combined.isValid).toBe(false);
      expect(combined.errors).toHaveLength(1);
    });
  });
});
