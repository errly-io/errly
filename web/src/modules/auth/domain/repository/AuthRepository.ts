import { RegistrationData } from '../../application/dto/RegistrationData';

// Auth response type - can be extended with more specific fields as needed
export interface AuthResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface AuthRepository {
  register(data: RegistrationData): Promise<AuthResponse>;
} 