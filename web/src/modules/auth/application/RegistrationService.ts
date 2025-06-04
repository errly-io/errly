import { RegistrationData } from './dto/RegistrationData';
import { AuthRepository, AuthResponse } from '../domain/repository/AuthRepository';
import { HttpAuthRepository } from '../infrastructure/repository/HttpAuthRepository';

// For simplicity, create repository instance here.
// In more complex systems this would be injected via DI container or service constructor (if the service was a class).
const authRepository: AuthRepository = new HttpAuthRepository();

export async function registerUser(values: RegistrationData): Promise<AuthResponse> {
  // Here can be additional logic before or after repository call,
  // for example, logging, calling domain services for validation (if they exist), etc.

  // Comments about error.response and error.data removed, as this is now encapsulated in repositories,
  // and RegistrationService just passes the error if it exists.
  return authRepository.register(values);
} 