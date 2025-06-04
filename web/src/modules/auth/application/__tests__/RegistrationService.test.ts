import { describe, it, expect, vi } from 'vitest';
import { registerUser } from '../RegistrationService'; // Path to the service under test
import { RegistrationData } from '../dto/RegistrationData';
import { AuthResponse } from '../../domain/repository/AuthRepository';
// No need to import HttpAuthRepository directly in test, if we're mocking the module

// Mock the HttpAuthRepository module
vi.mock('../../infrastructure/repository/HttpAuthRepository', () => {
  const mockRegister = vi.fn();
  return {
    HttpAuthRepository: vi.fn().mockImplementation(() => ({
      register: mockRegister,
    })),
    mockRegister, // Export for use in tests
  };
});

// Get the mock from the mocked module
const { mockRegister } = await vi.importMock('../../infrastructure/repository/HttpAuthRepository') as {
  mockRegister: ReturnType<typeof vi.fn>;
};

describe('RegistrationService', () => {
  describe('registerUser', () => {
    it('should call authRepository.register with correct data and return response on success', async () => {
      const registrationData: RegistrationData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedResponse: AuthResponse = { userId: '123', success: true };

      // Set up mock function register for successful result
      mockRegister.mockResolvedValue(expectedResponse);

      const result = await registerUser(registrationData);

      // Check that mock function register was called with correct data
      expect(mockRegister).toHaveBeenCalledWith(registrationData);
      // Check that result matches expected
      expect(result).toEqual(expectedResponse);
    });

    it('should throw an error if authRepository.register throws an error', async () => {
      const registrationData: RegistrationData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedError = new Error('Registration failed: Email already exists');

      // Set up mock function register to throw error
      mockRegister.mockRejectedValue(expectedError);

      // Check that registerUser passes the error
      // Vitest uses .rejects.toThrowError() for async functions
      await expect(registerUser(registrationData)).rejects.toThrowError(expectedError.message);

      // Also make sure mock was called
      expect(mockRegister).toHaveBeenCalledWith(registrationData);
    });
  });
});