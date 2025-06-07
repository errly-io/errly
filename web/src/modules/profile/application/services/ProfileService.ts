import { Effect, Context, Schedule, pipe, Layer, Schema } from "effect";
import { UserRepository } from "../../domain/repositories/UserRepository";
import { ProfileErrors, ValidationError } from "../../domain/errors/ProfileErrors";
import {
  UpdateProfileRequest,
  ChangePasswordRequest,
  UploadAvatarRequest,
  UpdateProfileRequestSchema,
  ChangePasswordRequestSchema,
  UploadAvatarRequestSchema
} from "../dto/UpdateProfileRequest";
import {
  ProfileResponse,
  UserSessionResponse,
  UserActivityResponse,
  toProfileResponse,
  toUserSessionResponse,
  toUserActivityResponse
} from "../dto/ProfileResponse";

// Profile service interface
export interface ProfileService {
  readonly getProfile: (userId: string) => Effect.Effect<ProfileResponse, ProfileErrors>;
  readonly updateProfile: (userId: string, request: UpdateProfileRequest) => Effect.Effect<ProfileResponse, ProfileErrors>;
  readonly uploadAvatar: (userId: string, request: UploadAvatarRequest) => Effect.Effect<string, ProfileErrors>;
  readonly deleteAvatar: (userId: string) => Effect.Effect<void, ProfileErrors>;
  readonly changePassword: (userId: string, request: ChangePasswordRequest) => Effect.Effect<void, ProfileErrors>;
  readonly getUserSessions: (userId: string) => Effect.Effect<UserSessionResponse[], ProfileErrors>;
  readonly revokeSession: (userId: string, sessionId: string) => Effect.Effect<void, ProfileErrors>;
  readonly getUserActivity: (userId: string, limit?: number) => Effect.Effect<UserActivityResponse[], ProfileErrors>;
}

// Context for DI
export const ProfileService = Context.GenericTag<ProfileService>("@profile/ProfileService");

// Service implementation
export const ProfileServiceLive = {
  getProfile: (userId: string) =>
    pipe(
      Effect.logInfo(`Getting profile for user: ${userId}`),
      Effect.flatMap(() => Effect.flatMap(UserRepository, (repo) => repo.getUserById(userId))),
      Effect.map(toProfileResponse),
      Effect.retry(
        Schedule.exponential("100 millis").pipe(
          Schedule.intersect(Schedule.recurs(3))
        )
      ),
      Effect.catchAll((error) =>
        pipe(
          Effect.logError(`Failed to get profile for user ${userId}`, error),
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    ),

  updateProfile: (userId: string, request: UpdateProfileRequest) =>
    pipe(
      Effect.logInfo(`Updating profile for user: ${userId}`),
      // Validate input data
      Effect.flatMap(() =>
        Effect.try({
          try: () => Schema.decodeUnknownSync(UpdateProfileRequestSchema)(request),
          catch: (error) => ValidationError.create("request", "Invalid update profile request", error)
        })
      ),
      Effect.flatMap((validatedRequest) =>
        Effect.flatMap(UserRepository, (repo) => repo.updateProfile(userId, validatedRequest))
      ),
      Effect.map(toProfileResponse),
      Effect.retry(
        Schedule.exponential("100 millis").pipe(
          Schedule.intersect(Schedule.recurs(2))
        )
      ),
      Effect.catchAll((error) =>
        pipe(
          Effect.logError(`Failed to update profile for user ${userId}`, error),
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    ),

  uploadAvatar: (userId: string, request: UploadAvatarRequest) =>
    pipe(
      Effect.logInfo(`Uploading avatar for user: ${userId}`),
      // Validate file
      Effect.flatMap(() =>
        Effect.try({
          try: () => Schema.decodeUnknownSync(UploadAvatarRequestSchema)(request),
          catch: (error) => ValidationError.create("file", "Invalid avatar file", error)
        })
      ),
      Effect.flatMap(() => Effect.flatMap(UserRepository, (repo) => repo.uploadAvatar(userId, request.file as File))),
      Effect.retry(
        Schedule.exponential("200 millis").pipe(
          Schedule.intersect(Schedule.recurs(2))
        )
      ),
      Effect.catchAll((error) =>
        pipe(
          Effect.logError(`Failed to upload avatar for user ${userId}`, error),
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    ),

  deleteAvatar: (userId: string) =>
    pipe(
      Effect.logInfo(`Deleting avatar for user: ${userId}`),
      Effect.flatMap(() => Effect.flatMap(UserRepository, (repo) => repo.deleteAvatar(userId))),
      Effect.retry(
        Schedule.exponential("100 millis").pipe(
          Schedule.intersect(Schedule.recurs(2))
        )
      ),
      Effect.catchAll((error) =>
        pipe(
          Effect.logError(`Failed to delete avatar for user ${userId}`, error),
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    ),

  changePassword: (userId: string, request: ChangePasswordRequest) =>
    pipe(
      Effect.logInfo(`Changing password for user: ${userId}`),
      // Validate request
      Effect.flatMap(() =>
        Effect.try({
          try: () => Schema.decodeUnknownSync(ChangePasswordRequestSchema)(request),
          catch: (error) => ValidationError.create("password", "Invalid password change request", error)
        })
      ),
      Effect.flatMap((validatedRequest) =>
        Effect.flatMap(UserRepository, (repo) => repo.changePassword(userId, validatedRequest.currentPassword, validatedRequest.newPassword))
      ),
      Effect.retry(
        Schedule.exponential("100 millis").pipe(
          Schedule.intersect(Schedule.recurs(1))
        )
      ),
      Effect.catchAll((error) =>
        pipe(
          Effect.logError(`Failed to change password for user ${userId}`, error),
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    ),

  getUserSessions: (userId: string) =>
    pipe(
      Effect.logInfo(`Getting sessions for user: ${userId}`),
      Effect.flatMap(() => Effect.flatMap(UserRepository, (repo) => repo.getUserSessions(userId))),
      Effect.map((sessions) => sessions.map(toUserSessionResponse)),
      Effect.retry(
        Schedule.exponential("100 millis").pipe(
          Schedule.intersect(Schedule.recurs(3))
        )
      ),
      Effect.catchAll((error) =>
        pipe(
          Effect.logError(`Failed to get sessions for user ${userId}`, error),
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    ),

  revokeSession: (userId: string, sessionId: string) =>
    pipe(
      Effect.logInfo(`Revoking session ${sessionId} for user: ${userId}`),
      Effect.flatMap(() => Effect.flatMap(UserRepository, (repo) => repo.revokeSession(userId, sessionId))),
      Effect.retry(
        Schedule.exponential("100 millis").pipe(
          Schedule.intersect(Schedule.recurs(2))
        )
      ),
      Effect.catchAll((error) =>
        pipe(
          Effect.logError(`Failed to revoke session ${sessionId} for user ${userId}`, error),
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    ),

  getUserActivity: (userId: string, limit?: number) =>
    pipe(
      Effect.logInfo(`Getting activity for user: ${userId}, limit: ${limit}`),
      Effect.flatMap(() => Effect.flatMap(UserRepository, (repo) => repo.getUserActivity(userId, limit))),
      Effect.map((activities) => activities.map(toUserActivityResponse)),
      Effect.retry(
        Schedule.exponential("100 millis").pipe(
          Schedule.intersect(Schedule.recurs(3))
        )
      ),
      Effect.catchAll((error) =>
        pipe(
          Effect.logError(`Failed to get activity for user ${userId}`, error),
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
};

// Helper for creating service layer
// ProfileServiceLive requires UserRepository as dependency
export const ProfileServiceLayer = Layer.effect(
  ProfileService,
  Effect.map(UserRepository, (userRepository) => ({
    getProfile: (userId: string) =>
      pipe(
        Effect.logInfo(`Getting profile for user: ${userId}`),
        Effect.flatMap(() => userRepository.getUserById(userId)),
        Effect.map(toProfileResponse),
        Effect.retry(
          Schedule.exponential("100 millis").pipe(
            Schedule.intersect(Schedule.recurs(3))
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.logError(`Failed to get profile for user ${userId}`, error),
            Effect.flatMap(() => Effect.fail(error))
          )
        )
      ),

    updateProfile: (userId: string, request: UpdateProfileRequest) =>
      pipe(
        Effect.logInfo(`Updating profile for user: ${userId}`),
        // Validate input data
        Effect.flatMap(() =>
          Effect.try({
            try: () => Schema.decodeUnknownSync(UpdateProfileRequestSchema)(request),
            catch: (error) => ValidationError.create("request", "Invalid update profile request", error)
          })
        ),
        Effect.flatMap((validatedRequest) =>
          userRepository.updateProfile(userId, validatedRequest)
        ),
        Effect.map(toProfileResponse),
        Effect.retry(
          Schedule.exponential("100 millis").pipe(
            Schedule.intersect(Schedule.recurs(2))
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.logError(`Failed to update profile for user ${userId}`, error),
            Effect.flatMap(() => Effect.fail(error))
          )
        )
      ),

    uploadAvatar: (userId: string, request: UploadAvatarRequest) =>
      pipe(
        Effect.logInfo(`Uploading avatar for user: ${userId}`),
        // Validate file
        Effect.flatMap(() =>
          Effect.try({
            try: () => Schema.decodeUnknownSync(UploadAvatarRequestSchema)(request),
            catch: (error) => ValidationError.create("file", "Invalid avatar file", error)
          })
        ),
        Effect.flatMap(() => userRepository.uploadAvatar(userId, request.file as File)),
        Effect.retry(
          Schedule.exponential("200 millis").pipe(
            Schedule.intersect(Schedule.recurs(2))
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.logError(`Failed to upload avatar for user ${userId}`, error),
            Effect.flatMap(() => Effect.fail(error))
          )
        )
      ),

    deleteAvatar: (userId: string) =>
      pipe(
        Effect.logInfo(`Deleting avatar for user: ${userId}`),
        Effect.flatMap(() => userRepository.deleteAvatar(userId)),
        Effect.retry(
          Schedule.exponential("100 millis").pipe(
            Schedule.intersect(Schedule.recurs(2))
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.logError(`Failed to delete avatar for user ${userId}`, error),
            Effect.flatMap(() => Effect.fail(error))
          )
        )
      ),

    changePassword: (userId: string, request: ChangePasswordRequest) =>
      pipe(
        Effect.logInfo(`Changing password for user: ${userId}`),
        // Validate request
        Effect.flatMap(() =>
          Effect.try({
            try: () => Schema.decodeUnknownSync(ChangePasswordRequestSchema)(request),
            catch: (error) => ValidationError.create("password", "Invalid password change request", error)
          })
        ),
        Effect.flatMap((validatedRequest) =>
          userRepository.changePassword(userId, validatedRequest.currentPassword, validatedRequest.newPassword)
        ),
        Effect.retry(
          Schedule.exponential("100 millis").pipe(
            Schedule.intersect(Schedule.recurs(1))
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.logError(`Failed to change password for user ${userId}`, error),
            Effect.flatMap(() => Effect.fail(error))
          )
        )
      ),

    getUserSessions: (userId: string) =>
      pipe(
        Effect.logInfo(`Getting sessions for user: ${userId}`),
        Effect.flatMap(() => userRepository.getUserSessions(userId)),
        Effect.map((sessions) => sessions.map(toUserSessionResponse)),
        Effect.retry(
          Schedule.exponential("100 millis").pipe(
            Schedule.intersect(Schedule.recurs(3))
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.logError(`Failed to get sessions for user ${userId}`, error),
            Effect.flatMap(() => Effect.fail(error))
          )
        )
      ),

    revokeSession: (userId: string, sessionId: string) =>
      pipe(
        Effect.logInfo(`Revoking session ${sessionId} for user: ${userId}`),
        Effect.flatMap(() => userRepository.revokeSession(userId, sessionId)),
        Effect.retry(
          Schedule.exponential("100 millis").pipe(
            Schedule.intersect(Schedule.recurs(2))
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.logError(`Failed to revoke session ${sessionId} for user ${userId}`, error),
            Effect.flatMap(() => Effect.fail(error))
          )
        )
      ),

    getUserActivity: (userId: string, limit?: number) =>
      pipe(
        Effect.logInfo(`Getting activity for user: ${userId}, limit: ${limit}`),
        Effect.flatMap(() => userRepository.getUserActivity(userId, limit)),
        Effect.map((activities) => activities.map(toUserActivityResponse)),
        Effect.retry(
          Schedule.exponential("100 millis").pipe(
            Schedule.intersect(Schedule.recurs(3))
          )
        ),
        Effect.catchAll((error) =>
          pipe(
            Effect.logError(`Failed to get activity for user ${userId}`, error),
            Effect.flatMap(() => Effect.fail(error))
          )
        )
      )
  }))
);
