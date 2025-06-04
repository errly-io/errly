import { Effect, Context } from "effect";
import { User, UpdateProfileData } from "../entities/User";
import { ProfileErrors } from "../errors/ProfileErrors";

// Repository interface for working with users
export interface UserRepository {
  readonly getUserById: (id: string) => Effect.Effect<User, ProfileErrors>;
  readonly updateProfile: (id: string, data: UpdateProfileData) => Effect.Effect<User, ProfileErrors>;
  readonly uploadAvatar: (id: string, file: File) => Effect.Effect<string, ProfileErrors>;
  readonly deleteAvatar: (id: string) => Effect.Effect<void, ProfileErrors>;
  readonly changePassword: (id: string, currentPassword: string, newPassword: string) => Effect.Effect<void, ProfileErrors>;
  readonly getUserSessions: (id: string) => Effect.Effect<UserSession[], ProfileErrors>;
  readonly revokeSession: (id: string, sessionId: string) => Effect.Effect<void, ProfileErrors>;
  readonly getUserActivity: (id: string, limit?: number) => Effect.Effect<UserActivity[], ProfileErrors>;
}

// Context for DI
export const UserRepository = Context.GenericTag<UserRepository>("@profile/UserRepository");

// Additional types
export interface UserSession {
  readonly id: string;
  readonly deviceInfo: string;
  readonly ipAddress: string;
  readonly location?: string;
  readonly createdAt: Date;
  readonly lastActiveAt: Date;
  readonly isCurrent: boolean;
}

export interface UserActivity {
  readonly id: string;
  readonly type: ActivityType;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  readonly ipAddress?: string;
}

export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PROFILE_UPDATE = 'profile_update',
  PASSWORD_CHANGE = 'password_change',
  AVATAR_UPLOAD = 'avatar_upload',
  SETTINGS_CHANGE = 'settings_change',
  SESSION_REVOKE = 'session_revoke'
}
