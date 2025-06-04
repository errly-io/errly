import { Schema } from "effect";

// DTO for profile update request
export const UpdateProfileRequestSchema = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))),
  avatar: Schema.optional(Schema.String),
  preferences: Schema.optional(Schema.Struct({
    emailNotifications: Schema.optional(Schema.Boolean),
    pushNotifications: Schema.optional(Schema.Boolean),
    weeklyDigest: Schema.optional(Schema.Boolean),
    theme: Schema.optional(Schema.Literal('light', 'dark', 'auto')),
    language: Schema.optional(Schema.String),
    timezone: Schema.optional(Schema.String)
  }))
});

export type UpdateProfileRequest = Schema.Schema.Type<typeof UpdateProfileRequestSchema>;

// DTO for password change
export const ChangePasswordRequestSchema = Schema.Struct({
  currentPassword: Schema.String.pipe(Schema.minLength(1)),
  newPassword: Schema.String.pipe(Schema.minLength(6), Schema.maxLength(128)),
  confirmPassword: Schema.String.pipe(Schema.minLength(6), Schema.maxLength(128))
}).pipe(
  Schema.filter((data) => data.newPassword === data.confirmPassword, {
    message: () => "Passwords do not match"
  })
);

export type ChangePasswordRequest = Schema.Schema.Type<typeof ChangePasswordRequestSchema>;

// DTO for avatar upload
export const UploadAvatarRequestSchema = Schema.Struct({
  file: Schema.Unknown // File object
}).pipe(
  Schema.filter((data) => {
    if (!(data.file instanceof File)) return false;
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(data.file.type)) return false;
    
    // Check file size (maximum 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (data.file.size > maxSize) return false;
    
    return true;
  }, {
    message: () => "Invalid file: must be an image (JPEG, PNG, WebP, GIF) and less than 5MB"
  })
);

export type UploadAvatarRequest = Schema.Schema.Type<typeof UploadAvatarRequestSchema>;
