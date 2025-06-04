import { RegistrationData } from '../../application/dto/RegistrationData';

// For now AuthResponse will be any, like the result of response.json()
// In the future, you can specify here more specific response type from registration API
export type AuthResponse = any;

export interface AuthRepository {
  register(data: RegistrationData): Promise<AuthResponse>;
} 