import 'dotenv/config';
import { emailPasswordAuthProvider, PasswordValidationError } from './server/src/features/auth/services/auth.service';

async function runTests() {
  console.log('--- Starting AuthService Verification Tests ---');

  // Test 1: Password validation with a weak password
  try {
    console.log('Test 1: Validating a weak password...');
    emailPasswordAuthProvider.validatePassword('weak');
    console.error('❌ FAIL: Weak password was incorrectly accepted.');
  } catch (error) {
    if (error instanceof PasswordValidationError) {
      console.log('✅ PASS: Weak password correctly rejected:', error.message);
    } else {
      console.error('❌ FAIL: Threw unexpected error:', error);
    }
  }

  // Test 2: Password validation with a valid strong password
  try {
    console.log('Test 2: Validating a strong password...');
    emailPasswordAuthProvider.validatePassword('StrongP@ss123');
    console.log('✅ PASS: Strong password accepted successfully.');
  } catch (error) {
    console.error('❌ FAIL: Strong password was rejected:', error);
  }

  // Test 3: Hash and Verify round-trip
  try {
    console.log('Test 3: Hashing password...');
    const plainText = 'SecureP@ssw0rd!';
    const hash = await emailPasswordAuthProvider.hashPassword(plainText);
    console.log('✅ PASS: Password hashed successfully. Hash length:', hash.length);

    console.log('Test 3b: Verifying with correct password...');
    const isValid = await emailPasswordAuthProvider.verifyPassword(plainText, hash);
    if (isValid) {
      console.log('✅ PASS: Hashed password matched plain-text successfully.');
    } else {
      console.error('❌ FAIL: Hashed password did not match plain-text.');
    }

    console.log('Test 3c: Verifying with wrong password...');
    const isInvalid = await emailPasswordAuthProvider.verifyPassword('WrongP@ss!', hash);
    if (!isInvalid) {
      console.log('✅ PASS: Wrong password correctly rejected.');
    } else {
      console.error('❌ FAIL: Verification incorrectly succeeded with incorrect password.');
    }
  } catch (error) {
    console.error('❌ FAIL: Error occurred during hash/verify round-trip:', error);
  }

  console.log('--- AuthService Verification Tests Completed ---');
}

runTests().catch((err) => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
