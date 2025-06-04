// Domain exports
export { User, UserRole, UserPreferences } from './domain/entities/User';
export type { UpdateProfileData } from './domain/entities/User';
export { UserSchema, UpdateProfileSchema } from './domain/entities/User';

export type {
  UserRepository,
  UserSession,
  UserActivity
} from './domain/repositories/UserRepository';
export { ActivityType } from './domain/repositories/UserRepository';

export type { ProfileErrors } from './domain/errors/ProfileErrors';
export {
  ProfileError,
  UserNotFoundError,
  ValidationError,
  UnauthorizedError,
  NetworkError,
  FileUploadError,
  RateLimitError
} from './domain/errors/ProfileErrors';

// Application exports
export type { ProfileService } from './application/services/ProfileService';
export { ProfileServiceLive, ProfileServiceLayer } from './application/services/ProfileService';

export type {
  UpdateProfileRequest,
  ChangePasswordRequest,
  UploadAvatarRequest
} from './application/dto/UpdateProfileRequest';
export {
  UpdateProfileRequestSchema,
  ChangePasswordRequestSchema,
  UploadAvatarRequestSchema
} from './application/dto/UpdateProfileRequest';

export type {
  ProfileResponse,
  UserSessionResponse,
  UserActivityResponse
} from './application/dto/ProfileResponse';
export {
  ProfileResponseSchema,
  UserSessionResponseSchema,
  UserActivityResponseSchema,
  toProfileResponse,
  toUserSessionResponse,
  toUserActivityResponse
} from './application/dto/ProfileResponse';

// Infrastructure exports
export { HttpUserRepository } from './infrastructure/repositories/HttpUserRepository';

// Component exports
export { ProfileForm } from './components/ProfileForm/ProfileForm';
export { ProfileAvatar } from './components/ProfileAvatar/ProfileAvatar';
export { ProfileSecurity } from './components/ProfileSecurity/ProfileSecurity';

// DI exports
export {
  ProfileModuleLayer,
  HttpUserRepositoryLayer
} from './di';
