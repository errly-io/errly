import { Effect, pipe, Schema } from "effect";
import { User, UpdateProfileData, UserSchema } from "../../domain/entities/User";
import { UserRepository, UserSession, UserActivity } from "../../domain/repositories/UserRepository";
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
        catch: (error) => NetworkError.create("Failed to fetch user", undefined, error)
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
        catch: (error) => NetworkError.create("Failed to update profile", undefined, error)
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
        if (typeof (data as any)?.avatarUrl !== 'string') {
          throw new Error('Invalid response: avatarUrl is not a string');
        }
        return (data as any).avatarUrl as string;
      })
    );

  deleteAvatar = (id: string): Effect.Effect<void, ProfileErrors> =>
    pipe(
      Effect.tryPromise({
        try: () => fetch(`${this.baseUrl}/users/${id}/avatar`, {
          method: 'DELETE',
        }),
        catch: (error) => NetworkError.create("Failed to delete avatar", undefined, error)
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
        catch: (error) => NetworkError.create("Failed to change password", undefined, error)
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
        catch: (error) => NetworkError.create("Failed to fetch user sessions", undefined, error)
      }),
      Effect.flatMap((response) => this.handleResponse(response)),
      Effect.map((data: unknown) => {
        if (!Array.isArray((data as any)?.sessions)) {
          throw new Error('Invalid response: sessions is not an array');
        }
        return (data as any).sessions.map((session: any) => ({
          id: session.id,
          deviceInfo: session.deviceInfo,
          ipAddress: session.ipAddress,
          location: session.location,
          createdAt: new Date(session.createdAt),
          lastActiveAt: new Date(session.lastActiveAt),
          isCurrent: session.isCurrent,
        }));
      })
    );

  revokeSession = (id: string, sessionId: string): Effect.Effect<void, ProfileErrors> =>
    pipe(
      Effect.tryPromise({
        try: () => fetch(`${this.baseUrl}/users/${id}/sessions/${sessionId}`, {
          method: 'DELETE',
        }),
        catch: (error) => NetworkError.create("Failed to revoke session", undefined, error)
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
        catch: (error) => NetworkError.create("Failed to fetch user activity", undefined, error)
      }),
      Effect.flatMap((response) => this.handleResponse(response)),
      Effect.map((data: unknown) => {
        if (!Array.isArray((data as any)?.activities)) {
          throw new Error('Invalid response: activities is not an array');
        }
        return (data as any).activities.map((activity: any) => ({
          id: activity.id,
          type: activity.type,
          description: activity.description,
          metadata: activity.metadata,
          createdAt: new Date(activity.createdAt),
          ipAddress: activity.ipAddress,
        }));
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
      Effect.map((userData) => User.create({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        avatar: userData.avatar,
        role: userData.role,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        isEmailVerified: userData.isEmailVerified,
        preferences: userData.preferences
      }))
    );
}
