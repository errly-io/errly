// Global setup for Vitest tests
export default async function setup() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TZ = 'UTC';

  // Mock console methods to reduce test noise
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Suppress specific React warnings in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: componentWillReceiveProps'))
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Vitest global setup completed
}
