// Example test to demonstrate Vitest setup
import { describe, it, expect, vi } from 'vitest';

// Example utility function to test
function formatError(message: string, code?: string): string {
  return code ? `[${code}] ${message}` : message;
}

// Example async function
async function fetchUserData(id: string): Promise<{ id: string; name: string }> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id, name: `User ${id}` });
    }, 100);
  });
}

describe('Error Formatting Utilities', () => {
  it('should format error message without code', () => {
    const result = formatError('Something went wrong');
    expect(result).toBe('Something went wrong');
  });

  it('should format error message with code', () => {
    const result = formatError('Something went wrong', 'ERR001');
    expect(result).toBe('[ERR001] Something went wrong');
  });

  it('should handle empty message', () => {
    const result = formatError('', 'ERR002');
    expect(result).toBe('[ERR002] ');
  });
});

describe('User Data Fetching', () => {
  it('should fetch user data successfully', async () => {
    const userData = await fetchUserData('123');
    
    expect(userData).toEqual({
      id: '123',
      name: 'User 123'
    });
  });

  it('should handle user ID validation', () => {
    const userId = '456';
    expect(userId).toBeValidUUID = false; // This will fail - just for demo
    expect(userId).toMatch(/^\d+$/); // Should pass - numeric ID
  });
});

describe('Vitest Features Demo', () => {
  it('should work with mocks', () => {
    const mockFn = vi.fn();
    mockFn('test');
    
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should work with spies', () => {
    const obj = {
      method: () => 'original'
    };
    
    const spy = vi.spyOn(obj, 'method').mockReturnValue('mocked');
    
    expect(obj.method()).toBe('mocked');
    expect(spy).toHaveBeenCalled();
    
    spy.mockRestore();
    expect(obj.method()).toBe('original');
  });

  it('should work with timers', () => {
    vi.useFakeTimers();
    
    const callback = vi.fn();
    setTimeout(callback, 1000);
    
    expect(callback).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalled();
    
    vi.useRealTimers();
  });

  it('should work with async/await', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    
    expect(result).toBe('success');
  });

  it('should demonstrate custom matchers', () => {
    const email = 'test@example.com';
    expect(email).toBeValidEmail();
    
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(uuid).toBeValidUUID();
  });
});
