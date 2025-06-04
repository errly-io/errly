#!/usr/bin/env tsx

/**
 * Script to create test users with passwords for development
 * Usage: npx tsx scripts/create-test-users.ts
 */

import { createTestUsers } from '../web/src/lib/utils/createTestUser';

async function main() {
  console.log('Creating test users...');
  
  try {
    const users = await createTestUsers();
    
    console.log('\n✅ Test users created successfully!');
    console.log('\nYou can now login with:');
    console.log('- Email: test@example.com, Password: password');
    console.log('- Email: admin@example.com, Password: admin123');
    console.log('- Email: user@example.com, Password: user123');
    
  } catch (error) {
    console.error('❌ Failed to create test users:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
