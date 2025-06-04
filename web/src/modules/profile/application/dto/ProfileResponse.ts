import { Schema } from "effect";
import { User, UserRole } from "../../domain/entities/User";
import { UserSession, UserActivity, ActivityType } from "../../domain/repositories/UserRepository";

// DTO for user profile response
export const ProfileResponseSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.String,
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

export type ProfileResponse = Schema.Schema.Type<typeof ProfileResponseSchema>;

// DTO for user sessions response
export const UserSessionResponseSchema = Schema.Struct({
  id: Schema.String,
  deviceInfo: Schema.String,
  ipAddress: Schema.String,
  location: Schema.optional(Schema.String),
  createdAt: Schema.Date,
  lastActiveAt: Schema.Date,
  isCurrent: Schema.Boolean
});

export type UserSessionResponse = Schema.Schema.Type<typeof UserSessionResponseSchema>;

// DTO for user activity response
export const UserActivityResponseSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.Enums(ActivityType),
  description: Schema.String,
  metadata: Schema.optional(Schema.Unknown), // Simplified to avoid errors
  createdAt: Schema.Date,
  ipAddress: Schema.optional(Schema.String)
});

export type UserActivityResponse = Schema.Schema.Type<typeof UserActivityResponseSchema>;

// Utilities for converting domain objects to DTOs
export const toProfileResponse = (user: User): ProfileResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatar: user.avatar,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  isEmailVerified: user.isEmailVerified,
  preferences: {
    emailNotifications: user.preferences.emailNotifications,
    pushNotifications: user.preferences.pushNotifications,
    weeklyDigest: user.preferences.weeklyDigest,
    theme: user.preferences.theme,
    language: user.preferences.language,
    timezone: user.preferences.timezone
  }
});

export const toUserSessionResponse = (session: UserSession): UserSessionResponse => ({
  id: session.id,
  deviceInfo: session.deviceInfo,
  ipAddress: session.ipAddress,
  location: session.location,
  createdAt: session.createdAt,
  lastActiveAt: session.lastActiveAt,
  isCurrent: session.isCurrent
});

export const toUserActivityResponse = (activity: UserActivity): UserActivityResponse => ({
  id: activity.id,
  type: activity.type,
  description: activity.description,
  metadata: activity.metadata,
  createdAt: activity.createdAt,
  ipAddress: activity.ipAddress
});
