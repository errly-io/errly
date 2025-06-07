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
    const params: { field: string; message: string; value?: unknown } = {
      field,
      message,
    };

    if (value !== undefined) {
      params.value = value;
    }

    return new ValidationError(params);
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
    const params: { message: string; statusCode?: number; cause?: unknown } = {
      message,
    };

    if (statusCode !== undefined) {
      params.statusCode = statusCode;
    }

    if (cause !== undefined) {
      params.cause = cause;
    }

    return new NetworkError(params);
  }
}

export class FileUploadError extends Data.TaggedError("FileUploadError")<{
  readonly message: string;
  readonly fileName?: string;
  readonly fileSize?: number;
  readonly cause?: unknown;
}> {
  static create(message: string, fileName?: string, fileSize?: number, cause?: unknown) {
    const params: { message: string; fileName?: string; fileSize?: number; cause?: unknown } = {
      message,
    };

    if (fileName !== undefined) {
      params.fileName = fileName;
    }

    if (fileSize !== undefined) {
      params.fileSize = fileSize;
    }

    if (cause !== undefined) {
      params.cause = cause;
    }

    return new FileUploadError(params);
  }
}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly message: string;
  readonly retryAfter?: number;
}> {
  static create(retryAfter?: number) {
    const params: { message: string; retryAfter?: number } = {
      message: "Rate limit exceeded",
    };

    if (retryAfter !== undefined) {
      params.retryAfter = retryAfter;
    }

    return new RateLimitError(params);
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
