import { Data } from "effect";

// Domain errors for profile
export class ProfileError extends Data.TaggedError("ProfileError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string;
  readonly message: string;
}> {
  static create(userId: string) {
    return new UserNotFoundError({
      userId,
      message: `User with id ${userId} not found`
    });
  }
}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly message: string;
  readonly value?: unknown;
}> {
  static create(field: string, message: string, value?: unknown) {
    return new ValidationError({
      field,
      message,
      value
    });
  }
}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly message: string;
  readonly action: string;
}> {
  static create(action: string) {
    return new UnauthorizedError({
      action,
      message: `Unauthorized to perform action: ${action}`
    });
  }
}

export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {
  static create(message: string, statusCode?: number, cause?: unknown) {
    return new NetworkError({
      message,
      statusCode,
      cause
    });
  }
}

export class FileUploadError extends Data.TaggedError("FileUploadError")<{
  readonly message: string;
  readonly fileName?: string;
  readonly fileSize?: number;
  readonly cause?: unknown;
}> {
  static create(message: string, fileName?: string, fileSize?: number, cause?: unknown) {
    return new FileUploadError({
      message,
      fileName,
      fileSize,
      cause
    });
  }
}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly message: string;
  readonly retryAfter?: number;
}> {
  static create(retryAfter?: number) {
    return new RateLimitError({
      message: "Rate limit exceeded",
      retryAfter
    });
  }
}

// Union type for all profile errors
export type ProfileErrors = 
  | ProfileError
  | UserNotFoundError
  | ValidationError
  | UnauthorizedError
  | NetworkError
  | FileUploadError
  | RateLimitError;
