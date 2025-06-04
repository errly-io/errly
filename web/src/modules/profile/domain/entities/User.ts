import { Schema } from "effect";

// User domain model
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly avatar?: string,
    public readonly role: UserRole = UserRole.USER,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    public readonly isEmailVerified = false,
    public readonly preferences: UserPreferences = new UserPreferences()
  ) {}

  static create(data: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role?: UserRole;
    createdAt?: Date;
    updatedAt?: Date;
    isEmailVerified?: boolean;
    preferences?: UserPreferences;
  }): User {
    return new User(
      data.id,
      data.email,
      data.name,
      data.avatar,
      data.role,
      data.createdAt,
      data.updatedAt,
      data.isEmailVerified,
      data.preferences
    );
  }

  updateProfile(data: {
    name?: string;
    avatar?: string;
    preferences?: Partial<UserPreferences>;
  }): User {
    return new User(
      this.id,
      this.email,
      data.name ?? this.name,
      data.avatar ?? this.avatar,
      this.role,
      this.createdAt,
      new Date(),
      this.isEmailVerified,
      data.preferences ? { ...this.preferences, ...data.preferences } : this.preferences
    );
  }
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export class UserPreferences {
  constructor(
    public readonly emailNotifications = true,
    public readonly pushNotifications = true,
    public readonly weeklyDigest = true,
    public readonly theme: 'light' | 'dark' | 'auto' = 'auto',
    public readonly language = 'en',
    public readonly timezone = 'UTC'
  ) {}
}

// Effect Schema for validation
export const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  avatar: Schema.optional(Schema.String),
  role: Schema.Enums(UserRole),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  isEmailVerified: Schema.Boolean,
  preferences: Schema.Struct({
    emailNotifications: Schema.Boolean,
    pushNotifications: Schema.Boolean,
    weeklyDigest: Schema.Boolean,
    theme: Schema.Literal('light', 'dark', 'auto'),
    language: Schema.String,
    timezone: Schema.String
  })
});

export const UpdateProfileSchema = Schema.Struct({
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

export type UpdateProfileData = Schema.Schema.Type<typeof UpdateProfileSchema>;
