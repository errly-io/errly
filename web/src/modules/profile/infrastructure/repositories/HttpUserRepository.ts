import { Effect, pipe, Schema } from "effect";
import { User, UpdateProfileData, UserSchema, UserRole, UserPreferences } from "../../domain/entities/User";
import { UserRepository, UserSession, UserActivity, ActivityType } from "../../domain/repositories/UserRepository";
import {
  ProfileErrors,
  NetworkError,
  UserNotFoundError,
  ValidationError,
  FileUploadError,
  RateLimitError
} from "../../domain/errors/ProfileErrors";

// HTTP repository implementation for users
export class HttpUserRepository implements UserRepository {
  constructor(private readonly baseUrl = '/api') {}

  getUserById = (id: string): Effect.Effect<User, ProfileErrors> =>
    pipe(
      Effect.tryPromise({
        try: () => fetch(`${this.baseUrl}/users/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        catch: (error) => NetworkError.create("Failed to fetch user", 500, error)
      }),
      Effect.flatMap((response) => this.handleResponse(response)),
      Effect.flatMap((data) => this.parseUser(data)),
      Effect.catchAll((error) => {
        if (error._tag === "NetworkError" && error.statusCode === 404) {
          return Effect.fail(UserNotFoundError.create(id));
        }
        return Effect.fail(error);
      })
    );

  updateProfile = (id: string, data: UpdateProfileData): Effect.Effect<User, ProfileErrors> =>
    pipe(
      Effect.tryPromise({
        try: () => fetch(`${this.baseUrl}/users/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }),
        catch: (error) => NetworkError.create("Failed to update profile", 500, error)
      }),
      Effect.flatMap((response) => this.handleResponse(response)),
      Effect.flatMap((data) => this.parseUser(data))
    );

  uploadAvatar = (id: string, file: File): Effect.Effect<string, ProfileErrors> =>
    pipe(
      Effect.tryPromise({
        try: () => {
          const formData = new FormData();
          formData.append('avatar', file);

          return fetch(`${this.baseUrl}/users/${id}/avatar`, {
            method: 'POST',
            body: formData,
          });
        },
        catch: (error) => FileUploadError.create("Failed to upload avatar", file.name, file.size, error)
      }),
      Effect.flatMap((response) => this.handleResponse(response)),
      Effect.map((data: unknown) => {
        const response = data as { avatarUrl?: unknown };
        if (typeof response?.avatarUrl !== 'string') {
          throw new Error('Invalid response: avatarUrl is not a string');
        }
        return response.avatarUrl;
      })
    );

  deleteAvatar = (id: string): Effect.Effect<void, ProfileErrors> =>
    pipe(
      Effect.tryPromise({
        try: () => fetch(`${this.baseUrl}/users/${id}/avatar`, {
          method: 'DELETE',
        }),
        catch: (error) => NetworkError.create("Failed to delete avatar", 500, error)
      }),
      Effect.flatMap((response) => this.handleResponse(response)),
      Effect.map(() => void 0)
    );

  changePassword = (id: string, currentPassword: string, newPassword: string): Effect.Effect<void, ProfileErrors> =>
    pipe(
      Effect.tryPromise({
        try: () => fetch(`${this.baseUrl}/users/${id}/password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }),
        catch: (error) => NetworkError.create("Failed to change password", 500, error)
      }),
      Effect.flatMap((response) => this.handleResponse(response)),
      Effect.map(() => void 0)
    );

  getUserSessions = (id: string): Effect.Effect<UserSession[], ProfileErrors> =>
    pipe(
      Effect.tryPromise({
        try: () => fetch(`${this.baseUrl}/users/${id}/sessions`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        catch: (error) => NetworkError.create("Failed to fetch user sessions", 500, error)
      }),
      Effect.flatMap((response) => this.handleResponse(response)),
      Effect.map((data: unknown) => {
        const response = data as { sessions?: unknown };
        if (!Array.isArray(response?.sessions)) {
          throw new Error('Invalid response: sessions is not an array');
        }
        return response.sessions.map((session: unknown) => {
          const sessionData = session as Record<string, unknown>;
          return {
            id: sessionData.id as string,
            deviceInfo: sessionData.deviceInfo as string,
            ipAddress: sessionData.ipAddress as string,
            location: sessionData.location as string,
            createdAt: new Date(sessionData.createdAt as string),
            lastActiveAt: new Date(sessionData.lastActiveAt as string),
            isCurrent: sessionData.isCurrent as boolean,
          };
        });
      })
    );

  revokeSession = (id: string, sessionId: string): Effect.Effect<void, ProfileErrors> =>
    pipe(
      Effect.tryPromise({
        try: () => fetch(`${this.baseUrl}/users/${id}/sessions/${sessionId}`, {
          method: 'DELETE',
        }),
        catch: (error) => NetworkError.create("Failed to revoke session", 500, error)
      }),
      Effect.flatMap((response) => this.handleResponse(response)),
      Effect.map(() => void 0)
    );

  getUserActivity = (id: string, limit?: number): Effect.Effect<UserActivity[], ProfileErrors> =>
    pipe(
      Effect.tryPromise({
        try: () => {
          const url = new URL(`${this.baseUrl}/users/${id}/activity`, window.location.origin);
          if (limit) {
            url.searchParams.set('limit', limit.toString());
          }

          return fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        },
        catch: (error) => NetworkError.create("Failed to fetch user activity", 500, error)
      }),
      Effect.flatMap((response) => this.handleResponse(response)),
      Effect.map((data: unknown) => {
        const response = data as { activities?: unknown };
        if (!Array.isArray(response?.activities)) {
          throw new Error('Invalid response: activities is not an array');
        }
        return response.activities.map((activity: unknown) => {
          const activityData = activity as Record<string, unknown>;
          return {
            id: activityData.id as string,
            type: activityData.type as ActivityType,
            description: activityData.description as string,
            metadata: activityData.metadata as Record<string, unknown>,
            createdAt: new Date(activityData.createdAt as string),
            ipAddress: activityData.ipAddress as string,
          };
        });
      })
    );

  // Private methods for handling responses
  private readonly handleResponse = (response: Response): Effect.Effect<unknown, ProfileErrors> =>
    pipe(
      Effect.tryPromise({
        try: async () => {
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          return response.json();
        },
        catch: (error) => {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            return RateLimitError.create(retryAfter ? parseInt(retryAfter) : undefined);
          }
          return NetworkError.create(
            error instanceof Error ? error.message : "Unknown network error",
            response.status,
            error
          );
        }
      })
    );

  private readonly parseUser = (data: unknown): Effect.Effect<User, ProfileErrors> =>
    pipe(
      Effect.try({
        try: () => Schema.decodeUnknownSync(UserSchema)(data),
        catch: (error) => ValidationError.create("user", "Invalid user data", error)
      }),
      Effect.map((userData) => {
        const userParams: {
          id: string;
          email: string;
          name: string;
          avatar?: string;
          role?: UserRole;
          createdAt?: Date;
          updatedAt?: Date;
          isEmailVerified?: boolean;
          preferences?: UserPreferences;
        } = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
        };

        if (userData.avatar !== undefined) {
          userParams.avatar = userData.avatar;
        }
        if (userData.role !== undefined) {
          userParams.role = userData.role;
        }
        if (userData.createdAt !== undefined) {
          userParams.createdAt = userData.createdAt;
        }
        if (userData.updatedAt !== undefined) {
          userParams.updatedAt = userData.updatedAt;
        }
        if (userData.isEmailVerified !== undefined) {
          userParams.isEmailVerified = userData.isEmailVerified;
        }
        if (userData.preferences !== undefined) {
          userParams.preferences = userData.preferences;
        }

        return User.create(userParams);
      })
    );
}
