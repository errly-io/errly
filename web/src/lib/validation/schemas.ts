import { z } from 'zod';

// User validation schemas
export const UpdateUserSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-'.]+$/, 'Name contains invalid characters'),
  avatar: z.string()
    .url('Avatar must be a valid URL')
    .optional()
    .nullable(),
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    language: z.string().min(2).max(5).optional(),
    timezone: z.string().optional()
  }).optional()
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

// File validation schemas
export const AvatarFileSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type),
      'File must be a valid image (JPEG, PNG, WebP, or GIF)'
    )
});

// Query parameter schemas
export const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

// ID validation schemas
export const UUIDSchema = z.string()
  .uuid('Invalid ID format');

export const UserIdSchema = z.object({
  id: UUIDSchema
});

export const SessionIdSchema = z.object({
  id: UUIDSchema,
  sessionId: UUIDSchema
});

// Request body validation
export const validateRequestBody = async <T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> => {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, error: errors.join(', ') };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('JSON validation error:', error);
    return { success: false, error: 'Invalid JSON in request body' };
  }
};

// Form data validation
export const validateFormData = async <T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> => {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, error: errors.join(', ') };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Form data validation error:', error);
    return { success: false, error: 'Invalid form data' };
  }
};

// Query parameters validation
export const validateSearchParams = <T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } => {
  try {
    const data: Record<string, string> = {};

    // Convert URLSearchParams to object, handling multiple values
    for (const [key, value] of searchParams.entries()) {
      data[key] = value;
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, error: errors.join(', ') };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Query parameters validation error:', error);
    return { success: false, error: 'Invalid query parameters' };
  }
};

// Path parameters validation
export const validatePathParams = <T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } => {
  try {
    const result = schema.safeParse(params);

    if (!result.success) {
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, error: errors.join(', ') };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Path parameters validation error:', error);
    return { success: false, error: 'Invalid path parameters' };
  }
};
